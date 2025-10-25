import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, isAdmin, AuthRequest, requireAuth } from '../middleware/auth';
import { manualCheckExpiringBenefits, manualArchiveExpiredBenefits } from '../services/scheduledTasks';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate, isAdmin);

// Create new credit card
router.post('/cards', async (req: AuthRequest, res) => {
  try {
    const card = await prisma.creditCard.create({
      data: req.body,
    });
    res.json(card);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create card' });
  }
});

// Update credit card
router.patch('/cards/:id', async (req: AuthRequest, res) => {
  try {
    const card = await prisma.creditCard.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
    });
    res.json(card);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update card' });
  }
});

// Delete credit card
router.delete('/cards/:id', async (req: AuthRequest, res) => {
  try {
    await prisma.creditCard.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete card' });
  }
});

// Create benefit for a card
router.post('/cards/:cardId/benefits', async (req: AuthRequest, res) => {
  try {
    console.log('Creating benefit for card:', req.params.cardId);
    console.log('Request body:', req.body);

    const benefit = await prisma.benefit.create({
      data: {
        ...req.body,
        cardId: parseInt(req.params.cardId),
      },
    });
    res.json(benefit);
  } catch (error: any) {
    console.error('Failed to create benefit:', error);
    res.status(500).json({
      error: 'Failed to create benefit',
      message: error.message,
      details: error
    });
  }
});

// Update benefit
router.patch('/benefits/:id', async (req: AuthRequest, res) => {
  try {
    console.log('Updating benefit:', req.params.id);
    console.log('Request body:', req.body);

    const benefit = await prisma.benefit.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
    });
    res.json(benefit);
  } catch (error: any) {
    console.error('Failed to update benefit:', error);
    res.status(500).json({
      error: 'Failed to update benefit',
      message: error.message,
      details: error
    });
  }
});

// Delete benefit
router.delete('/benefits/:id', async (req: AuthRequest, res) => {
  try {
    await prisma.benefit.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete benefit' });
  }
});

// 手動觸發福利到期檢查（僅供測試）
router.post('/manual/check-expiring-benefits', async (req: AuthRequest, res) => {
  try {
    const result = await manualCheckExpiringBenefits();
    res.json(result);
  } catch (error: any) {
    console.error('Error in manual check:', error);
    res.status(500).json({ error: error.message });
  }
});

// 手動觸發福利歸檔（僅供測試）
router.post('/manual/archive-expired-benefits', async (req: AuthRequest, res) => {
  try {
    const result = await manualArchiveExpiredBenefits();
    res.json(result);
  } catch (error: any) {
    console.error('Error in manual archive:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
