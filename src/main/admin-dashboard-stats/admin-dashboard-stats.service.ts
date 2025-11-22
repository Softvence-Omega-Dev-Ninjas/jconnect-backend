import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/lib/prisma/prisma.service";
import { AdminStatsDto, RevenueByMonthDto, TopSellerDto } from "./dto/admin-stats.dto";

@Injectable()
export class AdminDashboardStatsService {
    constructor(private prisma: PrismaService) {}

    // Aggregate key metrics for the dashboard overview cards
    async getAdminStats() {
        const [totalUsers, totalRevenue, totalDisputes] = await Promise.all([
            this.prisma.user.count({ where: { isDeleted: false, isActive: true } }),
            this.getTotalRevenue(),
            this.getTotalRefunds(),
        ]);

        return {
            totalUsers,
            totalRevenue,
            totalDisputes,
        };
    }

    // Revenue trend by month (for the main line chart)
    async getRevenueByMonth(): Promise<RevenueByMonthDto[]> {
        const result = (await this.prisma.$queryRaw`
            SELECT 
                TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') as month,
                SUM(amount) as revenue
            FROM payments 
            WHERE status = 'COMPLETED'
            GROUP BY DATE_TRUNC('month', "createdAt")
            ORDER BY month DESC
            LIMIT 12
        `) as { month: string; revenue: bigint }[];

        return result.map((item) => ({
            month: item.month,
            revenue: Number(item.revenue) / 100,
        }));
    }

    async getTopSellers(limit: number = 10): Promise<TopSellerDto[]> {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const buyServiceData = await this.prisma
            .$queryRaw`SELECT COUNT(*) as count FROM "BuyService"`;
        const hasBuyServiceData = Number((buyServiceData as any)[0].count) > 0;

        if (!hasBuyServiceData) {
            const result = await this.prisma.$queryRaw<
                {
                    sellerId: string;
                    sellerName: string;
                    totalRevenue: bigint;
                    completedDeals: bigint;
                    avgOrderValue: number;
                }[]
            >`
            SELECT 
                p."userId" as "sellerId",
                u.full_name AS "sellerName",
                SUM(p.amount) AS "totalRevenue",
                COUNT(p.id) AS "completedDeals",
                AVG(p.amount) AS "avgOrderValue"
            FROM payments AS p
            JOIN users AS u ON p."userId" = u.id
            WHERE p.status = 'COMPLETED' AND p."createdAt" >= ${thirtyDaysAgo}
            GROUP BY p."userId", u.full_name
            ORDER BY "totalRevenue" DESC
            LIMIT ${limit};
            `;

            return result.map((item) => ({
                sellerId: item.sellerId,
                sellerName: item.sellerName || "Unknown Seller",
                totalRevenue: Number(item.totalRevenue) / 100,
                completedDeals: Number(item.completedDeals),
                avgOrderValue: Number(item.avgOrderValue) / 100,
            }));
        }

        const result = await this.prisma.$queryRaw<
            {
                sellerId: string;
                sellerName: string;
                totalRevenue: bigint;
                completedDeals: bigint;
                avgOrderValue: number;
            }[]
        >`
        SELECT 
            bs."sellerId",
            u.full_name AS "sellerName",
            SUM(bs.amount) AS "totalRevenue",
            COUNT(bs.id) AS "completedDeals",
            AVG(bs.amount) AS "avgOrderValue"
        FROM "BuyService" AS bs
        JOIN payments AS p ON bs."paymentId" = p.id
        JOIN users AS u ON bs."sellerId" = u.id
        WHERE p.status = 'COMPLETED' AND bs."createdAt" >= ${thirtyDaysAgo}
        GROUP BY bs."sellerId", u.full_name
        ORDER BY "totalRevenue" DESC
        LIMIT ${limit};
        `;

        return result.map((item) => ({
            sellerId: item.sellerId,
            sellerName: item.sellerName || "Unknown Seller",
            totalRevenue: Number(item.totalRevenue) / 100,
            completedDeals: Number(item.completedDeals),
            avgOrderValue: Number(item.avgOrderValue) / 100,
        }));
    }

    // Top Performing Users (by amount of money spent/paid)
    async getTopPerformingUsers(limit: number = 10): Promise<TopSellerDto[]> {
        // Query aggregates completed payments grouped by the user (buyer)
        const result = (await this.prisma.$queryRaw`
            SELECT 
                p."userId" as "sellerId",
                u.full_name as "sellerName",
                SUM(p.amount) as "totalRevenue",
                COUNT(p.id) as "completedDeals",
                AVG(p.amount) as "avgOrderValue"
            FROM payments p
            JOIN users u ON p."userId" = u.id
            WHERE p.status = 'COMPLETED'
            GROUP BY p."userId", u.full_name
            ORDER BY "totalRevenue" DESC
            LIMIT ${limit}
        `) as {
            sellerId: string;
            sellerName: string;
            totalRevenue: bigint;
            completedDeals: bigint;
            avgOrderValue: number;
        }[];

        return result.map((item) => ({
            sellerId: item.sellerId,
            sellerName: item.sellerName,
            totalRevenue: Number(item.totalRevenue) / 100,
            completedDeals: Number(item.completedDeals),
            avgOrderValue: Number(item.avgOrderValue) / 100,
        }));
    }

    // Get Active User counts grouped by the day of the week over the last 7 days.
    async getUserActivityWeekly() {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setHours(0, 0, 0, 0);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const totalUsers = await this.prisma.user.count({
            where: { isDeleted: false, isActive: true },
        });

        const result = (await this.prisma.$queryRaw`
            WITH date_series AS (
                SELECT generate_series(
                    DATE_TRUNC('day', ${sevenDaysAgo}::timestamp),
                    DATE_TRUNC('day', ${today}::timestamp),
                    '1 day'::interval
                ) as active_day
            ),
            daily_active_users AS (
                SELECT
                    DATE_TRUNC('day', "lastUsedAt")::date as active_day,
                    COUNT(DISTINCT "userId") as active_count
                FROM devices
                WHERE 
                    "lastUsedAt" IS NOT NULL AND 
                    "lastUsedAt" >= DATE_TRUNC('day', ${sevenDaysAgo}::timestamp)
                GROUP BY 1
            )
            SELECT
                TO_CHAR(ds.active_day, 'Dy') as day,
                COALESCE(dau.active_count, 0) as active
            FROM date_series ds
            LEFT JOIN daily_active_users dau
            ON ds.active_day::date = dau.active_day
            ORDER BY ds.active_day ASC
        `) as { day: string; active: bigint }[];

        return result.map((item) => {
            const activeCount = Number(item.active);
            return {
                day: item.day,
                active: activeCount,
                inactive: Math.max(0, totalUsers - activeCount),
            };
        });
    }

    // --- Private Helper Methods for Overview Stats ---

    private async getTotalRevenue(): Promise<number> {
        const result = await this.prisma.payment.aggregate({
            where: { status: "COMPLETED" },
            _sum: { amount: true },
        });
        return (result._sum.amount || 0) / 100;
    }

    private async getTotalRefunds(): Promise<number> {
        // Refunds are tracked as CANCELLED payments
        return this.prisma.payment.count({
            where: { status: "CANCELLED" },
        });
    }
}
