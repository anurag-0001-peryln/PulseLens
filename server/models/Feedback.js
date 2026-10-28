import mongoose from 'mongoose';

export const SENTIMENTS = ['Positive', 'Neutral', 'Negative'];
export const CATEGORIES = [
  'Instructor',
  'Platform Bug',
  'Pricing',
  'Course Content',
  'Customer Support',
];
export const SOURCES = ['Web Form', 'CSV Upload'];

const feedbackSchema = new mongoose.Schema(
  {
    rawText: {
      type: String,
      required: [true, 'Feedback text is required'],
      trim: true,
      maxlength: 2000,
    },
    source: {
      type: String,
      enum: SOURCES,
      default: 'Web Form',
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    sentiment: {
      type: String,
      enum: SENTIMENTS,
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: CATEGORIES,
      required: true,
      index: true,
    },
    summary: {
      type: String,
      trim: true,
    },
    confidenceScore: {
      type: Number,
      min: 0,
      max: 1,
    },
  },
  { timestamps: true }
);

// Compound B-tree index for dashboard filtering + recency sorting
feedbackSchema.index({ createdAt: -1, sentiment: 1, category: 1 });

const Feedback = mongoose.model('Feedback', feedbackSchema);

export default Feedback;