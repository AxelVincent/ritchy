ALTER TYPE "public"."email_result" ADD VALUE 'catch_all' BEFORE 'unknown';--> statement-breakpoint
ALTER TYPE "public"."email_result" ADD VALUE 'error';--> statement-breakpoint
ALTER TYPE "public"."email_result" ADD VALUE 'disposable';--> statement-breakpoint
ALTER TYPE "public"."email_result" ADD VALUE 'invalid';