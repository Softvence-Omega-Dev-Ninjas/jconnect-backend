import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/lib/prisma/prisma.service";
import { AdminStatsDto, RevenueByMonthDto, TopSellerDto } from "./dto/admin-stats.dto";

@Injectable()
export class AdminDashboardStatsService {
    constructor(private prisma: PrismaService) {}

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
        // Assuming refunds are payments with status 'CANCELLED'
        return this.prisma.payment.count({
            where: { status: "CANCELLED" },
        });
    }
}
