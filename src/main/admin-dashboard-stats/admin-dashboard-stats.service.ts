// import { Injectable } from "@nestjs/common";
// import { PrismaService } from "src/lib/prisma/prisma.service";
// import { AdminStatsDto, RevenueByMonthDto, TopSellerDto } from "./dto/admin-stats.dto";

// @Injectable()
// export class AdminDashboardStatsService {
//     constructor(private prisma: PrismaService) { }

//     async getAdminStats(): Promise<AdminStatsDto> {
//         const [totalUsers, totalRevenue, totalDisputes, totalRefunds] = await Promise.all([
//             this.prisma.user.count(),
//             this.getTotalRevenue(),
//             this.getTotalDisputes(),
//             this.getTotalRefunds(),
//         ]);

//         return {
//             totalUsers,
//             totalRevenue,
//             totalDisputes,
//             totalRefunds,
//         };
//     }

//     async getRevenueByMonth(): Promise<RevenueByMonthDto[]> {
//         const result = (await this.prisma.$queryRaw`
//             SELECT
//                 TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') as month,
//                 SUM(amount) as revenue
//             FROM payments
//             WHERE status = 'COMPLETED'
//             GROUP BY DATE_TRUNC('month', "createdAt")
//             ORDER BY month DESC
//             LIMIT 12
//         `) as { month: string; revenue: bigint }[];

//         return result.map((item) => ({
//             month: item.month,
//             revenue: Number(item.revenue) / 100, // Convert from cents
//         }));
//     }

//     async getTopSellers(limit: number = 10): Promise<TopSellerDto[]> {
//         const result = (await this.prisma.$queryRaw`
//             SELECT
//                 bs."sellerId",
//                 u.full_name as "sellerName",
//                 SUM(bs.amount) as "totalRevenue",
//                 COUNT(bs.id) as "completedDeals",
//                 AVG(bs.amount) as "avgOrderValue"
//             FROM "BuyService" bs
//             JOIN users u ON bs."sellerId" = u.id
//             WHERE bs.status = 'SUCCESS'
//             GROUP BY bs."sellerId", u.full_name
//             ORDER BY "totalRevenue" DESC
//             LIMIT ${limit}
//         `) as {
//             sellerId: string;
//             sellerName: string;
//             totalRevenue: bigint;
//             completedDeals: bigint;
//             avgOrderValue: number;
//         }[];

//         return result.map((item) => ({
//             sellerId: item.sellerId,
//             sellerName: item.sellerName,
//             totalRevenue: Number(item.totalRevenue) / 100,
//             completedDeals: Number(item.completedDeals),
//             avgOrderValue: Number(item.avgOrderValue) / 100,
//         }));
//     }

//     private async getTotalRevenue(): Promise<number> {
//         const result = await this.prisma.payment.aggregate({
//             where: { status: "COMPLETED" },
//             _sum: { amount: true },
//         });
//         return (result._sum.amount || 0) / 100; // Convert from cents
//     }

//     private async getTotalDisputes(): Promise<number> {
//         // Assuming disputes are tracked in ServiceRequest with status 'DISPUTED'
//         return this.prisma.serviceRequest.count({
//             where: { status: "DISPUTED" },
//         });
//     }

//     private async getTotalRefunds(): Promise<number> {
//         // Assuming refunds are payments with status 'CANCELLED'
//         return this.prisma.payment.count({
//             where: { status: "CANCELLED" },
//         });
//     }
// }

import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/lib/prisma/prisma.service";
import { AdminStatsDto, RevenueByMonthDto, TopSellerDto } from "./dto/admin-stats.dto";

@Injectable()
export class AdminDashboardStatsService {
    constructor(private prisma: PrismaService) {}

    // Aggregate key metrics for the dashboard overview cards
    async getAdminStats(): Promise<AdminStatsDto> {
        const [totalUsers, totalRevenue, totalDisputes, totalRefunds] = await Promise.all([
            this.prisma.user.count(),
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
            revenue: Number(item.revenue) / 100, // Convert from cents
        }));
    }

    // Top Sellers table (by revenue from BuyService)
    async getTopSellers(limit: number = 10): Promise<TopSellerDto[]> {
        // NOTE: Query uses 'BuyService' table, assuming this tracks successful deals/sales.
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
        // NOTE: This query aggregates completed payments grouped by the user (buyer)
        const result = (await this.prisma.$queryRaw`
            SELECT 
                p."userId" as "sellerId", -- Using sellerId alias for TopSellerDto structure
                u.full_name as "sellerName",
                SUM(p.amount) as "totalRevenue",
                COUNT(p.id) as "completedDeals", -- Total payments made by user
                AVG(p.amount) as "avgOrderValue"
            FROM payments p
            JOIN users u ON p."userId" = u.id
            WHERE p.status = 'COMPLETED'
            GROUP BY p."userId", u.full_name
            ORDER BY "totalRevenue" DESC
            LIMIT ${limit}
        `) as {
            sellerId: string; // userId is aliased to sellerId for DTO mapping
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
        // Calculate the start date (7 days ago, rounded down to midnight)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setHours(0, 0, 0, 0); // Start of the day
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

        // Calculate the end date (today, rounded down to midnight)
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of the day

        const result = (await this.prisma.$queryRaw`
            WITH date_series AS (
                -- Generate a series of dates for the last 7 days
                SELECT generate_series(
                    ${sevenDaysAgo}::date,
                    ${today}::date,
                    '1 day'::interval
                ) as active_day
            ),
            daily_active_users AS (
                -- Count unique users who logged in/used the device each day
                SELECT
                    DATE_TRUNC('day', "lastUsedAt")::date as active_day,
                    COUNT(DISTINCT "userId") as active_count
                FROM devices
                WHERE "lastUsedAt" >= ${sevenDaysAgo}
                GROUP BY 1
            )
            -- LEFT JOIN to ensure all 7 days are included, even if active_count is 0
            SELECT
                TO_CHAR(ds.active_day, 'Dy') as day,
                EXTRACT(DOW FROM ds.active_day) as day_of_week_num,
                COALESCE(dau.active_count, 0) as active
            FROM date_series ds
            LEFT JOIN daily_active_users dau
            ON ds.active_day = dau.active_day
            ORDER BY ds.active_day ASC
        `) as { day: string; day_of_week_num: number; active: bigint }[];

        // NOTE: The previous 'inactive' calculation was removed as it was misleading.
        // This output now focuses purely on the Daily Active Users (DAU) trend.
        // If a true 'inactive' value is required, it should be derived client-side
        // as (Total Users - Daily Active Users), or redefined based on business logic.

        return result.map((item) => ({
            day: item.day,
            active: Number(item.active),
            // The 'inactive' field is ambiguous here. If the chart expects two series,
            // you must decide what the second series represents (e.g., New Signups, or total users)
            // For now, only return 'active' count trend.
        }));
    }

    // --- Private Helper Methods for Overview Stats ---

    private async getTotalRevenue(): Promise<number> {
        const result = await this.prisma.payment.aggregate({
            where: { status: "COMPLETED" },
            _sum: { amount: true },
        });
        return (result._sum.amount || 0) / 100; // Convert from cents
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
