import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AdminDashboardStatsService } from "./admin-dashboard-stats.service";
import { AdminStatsDto, RevenueByMonthDto, TopSellerDto } from "./dto/admin-stats.dto";

@ApiTags("Admin Dashboard Stats")
@ApiBearerAuth()
@Controller("admin/dashboard-stats")
export class AdminDashboardStatsController {
    constructor(private readonly adminStatsService: AdminDashboardStatsService) {}

    @Get("overview")
    @ApiOperation({ summary: "Get admin dashboard overview stats" })
    @ApiResponse({ status: 200, type: AdminStatsDto })
    async getOverviewStats(): Promise<AdminStatsDto> {
        return this.adminStatsService.getAdminStats();
    }

    @Get("revenue-by-month")
    @ApiOperation({ summary: "Get revenue trend by month for chart" })
    @ApiResponse({ status: 200, type: [RevenueByMonthDto] })
    async getRevenueByMonth(): Promise<RevenueByMonthDto[]> {
        return this.adminStatsService.getRevenueByMonth();
    }

    @Get("top-sellers")
    @ApiOperation({ summary: "Get top sellers with their performance metrics" })
    @ApiResponse({ status: 200, type: [TopSellerDto] })
    @ApiQuery({
        name: "limit",
        required: false,
        type: Number,
        description: "Number of top sellers to return",
    })
    async getTopSellers(@Query("limit") limit?: string): Promise<TopSellerDto[]> {
        const limitNumber = limit ? parseInt(limit, 10) : 10;
        return this.adminStatsService.getTopSellers(limitNumber);
    }
}
