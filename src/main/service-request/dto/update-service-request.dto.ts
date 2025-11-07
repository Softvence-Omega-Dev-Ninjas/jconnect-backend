// /src/servicerequest/dto/update-servicerequest.dto.ts
import { PartialType } from "@nestjs/mapped-types";
import { CreateServiceRequestDto } from "./create-service-request.dto";

// PartialType makes all fields optional for updating an existing request
export class UpdateServiceRequestDto extends PartialType(CreateServiceRequestDto) {}
