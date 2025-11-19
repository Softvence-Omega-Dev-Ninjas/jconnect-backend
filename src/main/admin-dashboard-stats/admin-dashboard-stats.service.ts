import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/lib/prisma/prisma.service";
import { AdminStatsDto, RevenueByMonthDto, TopSellerDto } from "./dto/admin-stats.dto";

@Injectable()
export class AdminDashboardStatsService {
    constructor(private prisma: PrismaService) {}

    // Aggregate key metrics for the dashboard overview cards
    async getAdminStats(): Promise<AdminStatsDto> {
        const [totalUsers, totalRevenue, totalDisputes, totalRefunds] = await Promise.all([
            this.prisma.user.count({ where: { isDeleted: false, isActive: true } }),
            this.getTotalRevenue(),
            this.getTotalDisputes(),
            this.getTotalRefunds(),
        ]);

        return {
            totalUsers,
            totalRevenue,
            totalDisputes,
            totalRefunds,
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

    // Top Sellers table (by revenue from BuyService)
    async getTopSellers(limit: number = 10): Promise<TopSellerDto[]> {
        const result = (await this.prisma.$queryRaw`
            SELECT 
                bs."sellerId",
                u.full_name as "sellerName",
                SUM(bs.amount) as "totalRevenue",
                COUNT(bs.id) as "completedDeals",
                AVG(bs.amount) as "avgOrderValue"
            FROM "BuyService" bs
            JOIN users u ON bs."sellerId" = u.id
            WHERE bs.status = 'SUCCESS'
            GROUP BY bs."sellerId", u.full_name
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

    // Top Performing Users (by amount of money spent/paid)
    async getTopPerformingUsers(limit: number = 10): Promise<TopSellerDto[]> {
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
        // Calculate the start date (7 days ago, start of the day)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setHours(0, 0, 0, 0);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

        // Calculate the end date (Today, start of the day)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Fetch total active user count
        const totalUsers = await this.prisma.user.count({
            where: { isDeleted: false, isActive: true },
        });

        const result = (await this.prisma.$queryRaw`
            WITH date_series AS (
                -- Generate a series of dates for the last 7 days
                SELECT generate_series(
                    DATE_TRUNC('day', ${sevenDaysAgo}::timestamp),
                    DATE_TRUNC('day', ${today}::timestamp),
                    '1 day'::interval
                ) as active_day
            ),
            daily_active_users AS (
                -- Count unique users who logged in/used the device each day
                SELECT
                    DATE_TRUNC('day', "lastUsedAt")::date as active_day,
                    COUNT(DISTINCT "userId") as active_count
                FROM devices
                -- ✅ FIX: Filter by active days starting 7 days ago, and ensure lastUsedAt is not null
                WHERE 
                    "lastUsedAt" IS NOT NULL AND 
                    "lastUsedAt" >= DATE_TRUNC('day', ${sevenDaysAgo}::timestamp)
                GROUP BY 1
            )
            -- LEFT JOIN to ensure all 7 days are included, even if active_count is 0
            SELECT
                TO_CHAR(ds.active_day, 'Dy') as day,
                COALESCE(dau.active_count, 0) as active
            FROM date_series ds
            LEFT JOIN daily_active_users dau
            ON ds.active_day::date = dau.active_day
            ORDER BY ds.active_day ASC
        `) as { day: string; active: bigint }[];

        // Calculate inactive users based on total users
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

    private async getTotalDisputes(): Promise<number> {
        // Assuming disputes are tracked in ServiceRequest with status 'DISPUTED'
        return this.prisma.serviceRequest.count({
            where: { status: "DISPUTED" },
        });
    }

    private async getTotalRefunds(): Promise<number> {
        // Assuming refunds are tracked as CANCELLED payments
        return this.prisma.payment.count({
            where: { status: "CANCELLED" },
        });
    }
}
