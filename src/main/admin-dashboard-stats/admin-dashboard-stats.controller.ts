import { ValidateSuperAdmin } from "@common/jwt/jwt.decorator";
import { Controller, Get, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AdminDashboardStatsService } from "./admin-dashboard-stats.service";
import { AdminStatsDto, RevenueByMonthDto, TopSellerDto } from "./dto/admin-stats.dto";

@ApiTags("Admin Dashboard Stats")
@ApiBearerAuth()
@Controller("admin/dashboard-stats")
export class AdminDashboardStatsController {
    constructor(private readonly adminStatsService: AdminDashboardStatsService) {}

    // @ApiBearerAuth()
    // @ValidateSuperAdmin()
    // @Get("overview")
    // @ApiOperation({
    //     summary: "Get admin dashboard overview stats (Users, Revenue, Disputes, Refunds)",
    // })
    // @ApiResponse({ status: 200, type: AdminStatsDto })
    // async getOverviewStats(): Promise<AdminStatsDto> {
    //     return this.adminStatsService.getAdminStats();
    // }

    @ApiBearerAuth()
    @ValidateSuperAdmin()
    @Get("revenue-by-month")
    @ApiOperation({ summary: "Get revenue trend by month for chart" })
    @ApiResponse({ status: 200, type: [RevenueByMonthDto] })
    async getRevenueByMonth(): Promise<RevenueByMonthDto[]> {
        return this.adminStatsService.getRevenueByMonth();
    }

    @ApiBearerAuth()
    @ValidateSuperAdmin()
    @Get("top-sellers")
    @ApiOperation({ summary: "Get top service sellers with their performance metrics" })
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

    // API for Top Performing Users (by revenue generated)
    @ApiBearerAuth()
    @ValidateSuperAdmin()
    @Get("top-performing-users")
    @ApiOperation({ summary: "Get top performing users by total payment amount" })
    @ApiResponse({ status: 200, type: [TopSellerDto] })
    @ApiQuery({
        name: "limit",
        required: false,
        type: Number,
        description: "Number of top performing users to return",
    })
    async getTopPerformingUsers(@Query("limit") limit?: string): Promise<TopSellerDto[]> {
        const limitNumber = limit ? parseInt(limit, 10) : 10;
        return this.adminStatsService.getTopPerformingUsers(limitNumber);
    }

    // API for Users Insights chart (Active vs Inactive)
    @ApiBearerAuth()
    @ValidateSuperAdmin()
    @Get("user-activity-weekly")
    @ApiOperation({
        summary: "Get active vs inactive user counts by day of the week (Placeholder Data)",
    })
    @ApiResponse({ status: 200, type: Object })
    async getUserActivityWeekly() {
        return this.adminStatsService.getUserActivityWeekly();
    }
}
