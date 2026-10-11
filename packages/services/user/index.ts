import { user } from "@repo/database";
import db, { eq } from "@repo/database";

class UserService {
  public async getUserById(id: string) {
    const result = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
      })
      .from(user)
      .where(eq(user.id, id))
      .limit(1);
    if (!result || result.length === 0) {
      return null;
    }
    return result[0];
  }
}

export default UserService;
