import { Router } from 'express';
import multer from 'multer';
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Feedback, { SENTIMENTS, CATEGORIES } from '../models/Feedback.js';
import { analyzeFeedback } from '../services/aiService.js';

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const isCsv =
      file.originalname.toLowerCase().endsWith('.csv') ||
      file.mimetype === 'text/csv' ||
      file.mimetype === 'application/vnd.ms-excel';
    if (!isCsv) return cb(new Error('Only .csv files are allowed'));
    cb(null, true);
  },
});

const BATCH_SIZE = 5;
const MAX_CSV_ROWS = 500;

const parseRating = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 && n <= 5 ? Math.round(n) : undefined;
};

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseCsvFile = (filePath) =>
  new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(
        csv({
          mapHeaders: ({ header }) => header.replace(/^\uFEFF/, '').trim().toLowerCase(),
        })
      )
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });

const extractText = (row) =>
  row.text || row.feedback || row.review || row.comment || row.rawtext || row.message || '';

/* ------------------------------------------------------------------ */
/* POST /api/feedback/seed  — 10 realistic sample reviews              */
/* ------------------------------------------------------------------ */
router.post('/seed', async (_req, res, next) => {
  try {
    const samples = [
      { rawText: 'My daughter loves her math instructor. Ms. Rao explains fractions so clearly that she now enjoys homework.', rating: 5, sentiment: 'Positive', category: 'Instructor', summary: 'Parent praises the math instructor for clear explanations that boosted the child’s enjoyment.', confidenceScore: 0.97 },
      { rawText: 'The app crashes every time I try to open the live class on my tablet. We missed two sessions this week.', rating: 1, sentiment: 'Negative', category: 'Platform Bug', summary: 'Live class feature crashes on tablet, causing missed sessions.', confidenceScore: 0.96 },
      { rawText: 'The monthly subscription is too expensive for what is offered. A family discount would really help.', rating: 2, sentiment: 'Negative', category: 'Pricing', summary: 'Parent finds the subscription too costly and requests a family discount.', confidenceScore: 0.93 },
      { rawText: 'The science course content is well structured with great quizzes after each chapter. Very engaging for my son.', rating: 5, sentiment: 'Positive', category: 'Course Content', summary: 'Well-structured science course with engaging quizzes.', confidenceScore: 0.95 },
      { rawText: 'I emailed support about a billing issue and got a helpful reply within an hour. Great service!', rating: 5, sentiment: 'Positive', category: 'Customer Support', summary: 'Support resolved a billing issue quickly with a helpful reply.', confidenceScore: 0.94 },
      { rawText: 'Videos keep buffering and the login page throws an error about every other day. Very frustrating.', rating: 2, sentiment: 'Negative', category: 'Platform Bug', summary: 'Frequent video buffering and intermittent login errors frustrate the user.', confidenceScore: 0.91 },
      { rawText: 'The course material is okay. Some lessons are good, others feel a bit repetitive. Nothing special.', rating: 3, sentiment: 'Neutral', category: 'Course Content', summary: 'Course material is mixed, with some repetitive lessons.', confidenceScore: 0.82 },
      { rawText: 'Our tutor often arrives late to sessions and seems unprepared. My child is losing interest.', rating: 2, sentiment: 'Negative', category: 'Instructor', summary: 'Tutor is frequently late and unprepared, reducing the child’s interest.', confidenceScore: 0.92 },
      { rawText: 'Pricing is fair compared to other platforms. The annual plan saved us quite a bit of money.', rating: 4, sentiment: 'Positive', category: 'Pricing', summary: 'Annual plan is considered fairly priced and cost-saving.', confidenceScore: 0.9 },
      { rawText: 'Support took three days to respond to my ticket. It was resolved eventually but the wait was long.', rating: 3, sentiment: 'Neutral', category: 'Customer Support', summary: 'Support resolved the ticket but response time was slow.', confidenceScore: 0.8 },
    ];

    const docs = samples.map((s) => ({ ...s, source: 'Web Form' }));
    const inserted = await Feedback.insertMany(docs);

    res.status(201).json({
      message: `Seeded ${inserted.length} sample feedback records`,
      count: inserted.length,
    });
  } catch (error) {
    next(error);
  }
});

/* ------------------------------------------------------------------ */
/* POST /api/feedback/batch-csv — CSV upload                           */
/* ------------------------------------------------------------------ */
router.post('/batch-csv', upload.single('file'), async (req, res, next) => {
  const filePath = req.file?.path;

  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No CSV file uploaded (field name must be "file")' });
    }

    const rows = await parseCsvFile(filePath);

    const entries = rows
      .map((row) => ({
        text: String(extractText(row)).trim().slice(0, 2000),
        rating: parseRating(row.rating),
      }))
      .filter((e) => e.text.length > 0)
      .slice(0, MAX_CSV_ROWS);

    if (entries.length === 0) {
      return res.status(400).json({
        message: 'No valid rows found. Make sure the CSV has a header row with "text" (or "feedback") and optional "rating" columns.',
      });
    }

    let saved = 0;

    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const chunk = entries.slice(i, i + BATCH_SIZE);

      const docs = await Promise.all(
        chunk.map(async (entry) => {
          const analysis = await analyzeFeedback(entry.text, entry.rating);
          return {
            rawText: entry.text,
            rating: entry.rating,
            source: 'CSV Upload',
            ...analysis,
          };
        })
      );

      const inserted = await Feedback.insertMany(docs);
      saved += inserted.length;
    }

    res.status(201).json({
      message: `Processed ${saved} feedback entries from CSV`,
      processed: saved,
      skipped: rows.length - entries.length,
      totalRows: rows.length,
    });
  } catch (error) {
    next(error);
  } finally {
    if (filePath) {
      fs.unlink(filePath, () => {});
    }
  }
});

/* ------------------------------------------------------------------ */
/* GET /api/feedback/analytics — $facet aggregation                    */
/* ------------------------------------------------------------------ */
router.get('/analytics', async (_req, res, next) => {
  try {
    const [result] = await Feedback.aggregate([
      {
        $facet: {
          sentimentDistribution: [
            { $group: { _id: '$sentiment', count: { $sum: 1 } } },
          ],
          categoryBreakdown: [
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ],
          sentimentByCategory: [
            {
              $group: {
                _id: { category: '$category', sentiment: '$sentiment' },
                count: { $sum: 1 },
              },
            },
            { $sort: { '_id.category': 1, '_id.sentiment': 1 } },
          ],
          summaryMetrics: [
            {
              $group: {
                _id: null,
                totalCount: { $sum: 1 },
                averageRating: { $avg: '$rating' },
                averageConfidence: { $avg: '$confidenceScore' },
              },
            },
          ],
        },
      },
    ]);

    const sentimentMap = Object.fromEntries(
      (result?.sentimentDistribution || []).map((s) => [s._id, s.count])
    );
    const categoryMap = Object.fromEntries(
      (result?.categoryBreakdown || []).map((c) => [c._id, c.count])
    );

    const sentimentDistribution = SENTIMENTS.map((sentiment) => ({
      sentiment,
      count: sentimentMap[sentiment] || 0,
    }));

    const categoryBreakdown = CATEGORIES.map((category) => ({
      category,
      count: categoryMap[category] || 0,
    }));

    const sentimentByCategory = (result?.sentimentByCategory || []).map((row) => ({
      category: row._id.category,
      sentiment: row._id.sentiment,
      count: row.count,
    }));

    const metrics = result?.summaryMetrics?.[0];
    const summaryMetrics = {
      totalCount: metrics?.totalCount || 0,
      averageRating: metrics?.averageRating != null ? Number(metrics.averageRating.toFixed(2)) : 0,
      averageConfidence:
        metrics?.averageConfidence != null ? Number(metrics.averageConfidence.toFixed(3)) : 0,
    };

    res.json({ sentimentDistribution, categoryBreakdown, sentimentByCategory, summaryMetrics });
  } catch (error) {
    next(error);
  }
});

/* ------------------------------------------------------------------ */
/* GET /api/feedback — paginated + filterable                          */
/* ------------------------------------------------------------------ */
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const { sentiment, category, search } = req.query;

    const filter = {};
    if (sentiment && SENTIMENTS.includes(sentiment)) filter.sentiment = sentiment;
    if (category && CATEGORIES.includes(category)) filter.category = category;
    if (search && String(search).trim()) {
      const regex = new RegExp(escapeRegex(String(search).trim()), 'i');
      filter.$or = [{ rawText: regex }, { summary: regex }];
    }

    const [data, total] = await Promise.all([
      Feedback.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Feedback.countDocuments(filter),
    ]);

    res.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    });
  } catch (error) {
    next(error);
  }
});

/* ------------------------------------------------------------------ */
/* POST /api/feedback — single ingestion                               */
/* ------------------------------------------------------------------ */
router.post('/', async (req, res, next) => {
  try {
    const { rawText, rating } = req.body || {};

    if (typeof rawText !== 'string' || !rawText.trim()) {
      return res.status(400).json({ message: 'rawText is required' });
    }

    const text = rawText.trim().slice(0, 2000);
    const parsedRating = parseRating(rating);

    const analysis = await analyzeFeedback(text, parsedRating);

    const created = await Feedback.create({
      rawText: text,
      rating: parsedRating,
      source: 'Web Form',
      ...analysis,
    });

    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

/* ------------------------------------------------------------------ */
/* DELETE /api/feedback/:id                                            */
/* ------------------------------------------------------------------ */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: 'Invalid feedback id' });
    }

    const deleted = await Feedback.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Feedback not found' });
    }

    res.json({ message: 'Feedback deleted', id });
  } catch (error) {
    next(error);
  }
});

export default router;