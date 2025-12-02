import { Body, Controller, Delete, Get, Param, Post, Put, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SavedPlacesService } from './saved-places.service';
import type { CreateSavedPlaceDto } from './dto/create-saved-place.dto';
import type { UpdateSavedPlaceDto } from './dto/update-saved-place.dto';

@Controller('saved-places')
@UseGuards(JwtAuthGuard)
export class SavedPlacesController {
  constructor(private readonly savedPlacesService: SavedPlacesService) {}

  @Post()
  async create(@Request() req, @Body() body: CreateSavedPlaceDto) {
    const place = await this.savedPlacesService.create(req.user.userId, body);
    return { message: 'Saved place created', place };
  }

  @Get()
  async list(@Request() req) {
    const places = await this.savedPlacesService.list(req.user.userId);
    return { message: 'Saved places retrieved', places };
  }

  @Put(':id')
  async update(@Request() req, @Param('id') id: string, @Body() body: UpdateSavedPlaceDto) {
    const place = await this.savedPlacesService.update(req.user.userId, id, body);
    return { message: 'Saved place updated', place };
  }

  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string) {
    await this.savedPlacesService.softDelete(req.user.userId, id);
    return { message: 'Saved place deleted' };
  }
}


