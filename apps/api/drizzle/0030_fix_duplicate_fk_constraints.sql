-- Drop both foreign key constraints
ALTER TABLE "list" DROP CONSTRAINT IF EXISTS "list_user_id_new_user_id_fk";
ALTER TABLE "list" DROP CONSTRAINT IF EXISTS "list_user_id_user_id_fk";

-- Add back just one constraint
ALTER TABLE "list" 
ADD CONSTRAINT "list_user_id_user_id_fk" 
FOREIGN KEY ("user_id") 
REFERENCES "user"("id") 
ON DELETE CASCADE;