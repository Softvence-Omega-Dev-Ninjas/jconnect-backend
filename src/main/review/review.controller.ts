import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
} from "@nestjs/common";
import { CreateReviewDto } from "./dto/create-review.dto";
import { UpdateReviewDto } from "./dto/update-review.dto";
import { ReviewService } from "./review.service";

@Controller("reviews")
export class ReviewController {
    constructor(private readonly reviewService: ReviewService) {}

    // POST /reviews
    @Post()
    @HttpCode(HttpStatus.CREATED)
    create(@Body() createReviewDto: CreateReviewDto) {
        return this.reviewService.create(createReviewDto);
    }

    // GET /reviews/artist/:artistId
    @Get("artist/:artistId")
    findAllByArtist(@Param("artistId") artistId: string) {
        return this.reviewService.findAllByArtist(artistId);
    }

    // PATCH /reviews/:id
    @Patch(":id")
    update(@Param("id") id: string, @Body() updateReviewDto: UpdateReviewDto) {
        return this.reviewService.update(id, updateReviewDto);
    }

    // DELETE /reviews/:id
    @Delete(":id")
    remove(@Param("id") id: string) {
        return this.reviewService.remove(id);
    }
}
