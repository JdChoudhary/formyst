import { AdminService } from "@repo/services/admin";
import { AIBuilderService } from "@repo/services/ai-builder";
import { FormService } from "@repo/services/form";
import { FormResponseService } from "@repo/services/response";
import { ThemeService } from "@repo/services/theme";

// export const userService = new UserService();
export const adminService = new AdminService();
export const aiBuilderService = new AIBuilderService();
export const formService = new FormService();
export const responseService = new FormResponseService();
export const themeService = new ThemeService();
