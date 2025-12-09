import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
// Ensure this path matches your PrismaService location
import { PrismaService } from "src/lib/prisma/prisma.service";
import { CreateReviewDto } from "./dto/create-review.dto";
import { UpdateReviewDto } from "./dto/update-review.dto";

@Injectable()
export class ReviewService {
    constructor(private prisma: PrismaService) {}

    // ** 1. CREATE (Create Review) - POST **
    async create(createReviewDto: CreateReviewDto, user: any) {
        // Prevent self-reviewing
        if (user.userId === createReviewDto.artistId) {
            throw new BadRequestException("An artist cannot review themselves.");
        }

        try {
            return await this.prisma.review.create({
                data: { ...createReviewDto, reviewerId: user.userId },
            });
        } catch (error) {
            // Handle Prisma unique constraint violation (P2002)
            if (error.code === "P2002") {
                throw new BadRequestException("You have already reviewed this artist.");
            }
            throw error;
        }
    }

    // ** 2. READ (Fetch all reviews for an Artist) - GET **
    async findAllByArtist(artistId: string) {
        // 1. Fetch all reviews for the artist
        const reviews = await this.prisma.review.findMany({
            where: { artistId },
            include: {
                // Include the reviewer's full_name and email
                reviewer: {
                    select: { full_name: true, email: true },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        // 2. Calculate the aggregate rating (average and count)
        const avgRating = await this.prisma.review.aggregate({
            _avg: { rating: true },
            _count: { rating: true },
            where: { artistId },
        });

        return {
            reviews,
            // Format the average rating to two decimal places
            averageRating: avgRating._avg.rating ? parseFloat(avgRating._avg.rating.toFixed(2)) : 0,
            totalReviews: avgRating._count.rating,
        };
    }

    // ** 3. UPDATE (Update Review) - PATCH **
    async update(id: string, updateReviewDto: UpdateReviewDto) {
        try {
            const updatedReview = await this.prisma.review.update({
                where: { id },
                // Use spread operator to update only provided fields
                data: {
                    // This works because updateReviewDto fields are optional/undefined if not sent
                    ...updateReviewDto,
                },
            });
            return updatedReview;
        } catch (error) {
            if (error.code === "P2025") {
                // Prisma error code for record not found
                throw new NotFoundException(`Review with ID ${id} not found.`);
            }
            throw error;
        }
    }

    // ** 4. DELETE (Delete Review) - DELETE **
    async remove(id: string) {
        try {
            // Prisma delete returns the deleted object
            const deletedReview = await this.prisma.review.delete({
                where: { id },
            });
            return deletedReview; // Returns the deleted object
        } catch (error) {
            if (error.code === "P2025") {
                throw new NotFoundException(`Review with ID ${id} not found.`);
            }
            throw error;
        }
    }
}
