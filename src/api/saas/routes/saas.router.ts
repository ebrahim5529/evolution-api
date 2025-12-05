import { Router, Request, Response } from 'express';
import { isSaasAuthenticated, isSaasAdmin } from '../auth/replitAuth';
import { saasStorage } from '../auth/storage';
import { UserRole } from '@prisma/client';
import { join } from 'path';
import { ROOT_DIR } from '@config/path.config';

const saasRouter = Router();

const serveFile = (filePath: string) => (req: Request, res: Response) => {
  res.sendFile(join(ROOT_DIR, filePath));
};

saasRouter.get('/dashboard', serveFile('public/dashboard/index.html'));
saasRouter.get('/dashboard/', serveFile('public/dashboard/index.html'));
saasRouter.get('/dashboard/*', serveFile('public/dashboard/index.html'));

saasRouter.get('/admin', serveFile('public/admin/index.html'));
saasRouter.get('/admin/', serveFile('public/admin/index.html'));
saasRouter.get('/admin/*', serveFile('public/admin/index.html'));

saasRouter.get('/landing', serveFile('public/landing.html'));

saasRouter.get('/api/auth/user', isSaasAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const user = await saasStorage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
      role: user.role,
      apiKey: user.apiKey,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

saasRouter.get('/api/user/instances', isSaasAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user?.claims?.sub;
    const instances = await saasStorage.getUserInstances(userId);
    res.json(instances);
  } catch (error) {
    console.error("Error fetching instances:", error);
    res.status(500).json({ message: "Failed to fetch instances" });
  }
});

saasRouter.get('/api/user/subscription', isSaasAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user?.claims?.sub;
    const subscription = await saasStorage.getSubscription(userId);
    res.json(subscription);
  } catch (error) {
    console.error("Error fetching subscription:", error);
    res.status(500).json({ message: "Failed to fetch subscription" });
  }
});

saasRouter.post('/api/user/apikey/regenerate', isSaasAuthenticated, async (req: any, res: Response) => {
  try {
    const userId = req.user?.claims?.sub;
    const newApiKey = await saasStorage.generateApiKey(userId);
    res.json({ apiKey: newApiKey });
  } catch (error) {
    console.error("Error regenerating API key:", error);
    res.status(500).json({ message: "Failed to regenerate API key" });
  }
});

saasRouter.get('/api/admin/users', isSaasAuthenticated, isSaasAdmin, async (req: any, res: Response) => {
  try {
    const users = await saasStorage.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

saasRouter.get('/api/admin/stats', isSaasAuthenticated, isSaasAdmin, async (req: any, res: Response) => {
  try {
    const stats = await saasStorage.getStats();
    res.json(stats);
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
});

saasRouter.patch('/api/admin/users/:userId/role', isSaasAuthenticated, isSaasAdmin, async (req: any, res: Response) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    
    if (!Object.values(UserRole).includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }
    
    const user = await saasStorage.updateUserRole(userId, role);
    res.json(user);
  } catch (error) {
    console.error("Error updating user role:", error);
    res.status(500).json({ message: "Failed to update user role" });
  }
});

saasRouter.delete('/api/admin/users/:userId', isSaasAuthenticated, isSaasAdmin, async (req: any, res: Response) => {
  try {
    const { userId } = req.params;
    await saasStorage.deleteUser(userId);
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Failed to delete user" });
  }
});

export { saasRouter };
