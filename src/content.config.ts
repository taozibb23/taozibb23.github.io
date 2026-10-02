import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updated: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    /** CSDN 原文链接(已同步发布的文章填,没有就删掉这行) */
    csdn: z.string().url().optional(),
    /** true = 本地 dev 可预览,build 时不输出 */
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
