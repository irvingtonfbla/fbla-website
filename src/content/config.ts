import { defineCollection, z } from 'astro:content';

// Define the schema for news/press releases
const pressCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishDate: z.date(),
    author: z.string().optional(),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    category: z.enum(['news', 'press-release', 'achievement', 'event']),
    featured: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
  }),
});

// Define the schema for events
const eventsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    startDate: z.date(),
    endDate: z.date().optional(),
    location: z.string(),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    category: z.enum(['meeting', 'competition', 'conference', 'service', 'social', 'workshop']),
    registrationRequired: z.boolean().default(false),
    registrationLink: z.string().optional(),
    cost: z.string().optional(),
    featured: z.boolean().default(false),
  }),
});

// Define the schema for officer profiles
const officersCollection = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    position: z.string(),
    grade: z.number(),
    bio: z.string(),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    email: z.string().email().optional(),
    linkedin: z.string().optional(),
    achievements: z.array(z.string()).default([]),
    goals: z.array(z.string()).default([]),
    order: z.number().default(0),
  }),
});

// Define the schema for success stories/achievements
const successCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.date(),
    category: z.enum(['competition', 'scholarship', 'leadership', 'service', 'recognition']),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    participants: z.array(z.string()).default([]),
    award: z.string().optional(),
    level: z.enum(['local', 'regional', 'state', 'national']).optional(),
    featured: z.boolean().default(false),
  }),
});

// Define the schema for gallery items
const galleryCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.date(),
    image: z.string(),
    imageAlt: z.string(),
    category: z.enum(['events', 'competitions', 'meetings', 'service', 'conferences', 'social']),
    photographer: z.string().optional(),
    featured: z.boolean().default(false),
  }),
});

// Define the schema for sponsors
const sponsorsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    description: z.string().optional(),
    logo: z.string(),
    logoAlt: z.string(),
    website: z.string().optional(),
    tier: z.enum(['platinum', 'gold', 'silver', 'bronze', 'supporter']),
    active: z.boolean().default(true),
    order: z.number().default(0),
  }),
});

// Export collections
export const collections = {
  'press': pressCollection,
  'events': eventsCollection,
  'officers': officersCollection,
  'success': successCollection,
  'gallery': galleryCollection,
  'sponsors': sponsorsCollection,
};