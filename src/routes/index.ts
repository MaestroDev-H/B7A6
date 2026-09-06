import { Router } from 'express';
import { AuthRoutes } from '../modules/auth/auth.routes';
import { UsersRoutes } from '../modules/users/users.routes';
import { PropertiesRoutes } from '../modules/properties/properties.routes';
import { RoomsRoutes } from '../modules/rooms/rooms.routes';
import { RoommateRoutes } from '../modules/roommate/roommate.routes';
import { ViewingsRoutes } from '../modules/viewings/viewings.routes';
import { ApplicationsRoutes } from '../modules/applications/applications.routes';
import { TenanciesRoutes } from '../modules/tenancies/tenancies.routes';
import { PaymentsRoutes } from '../modules/payments/payments.routes';
import { MaintenanceRoutes } from '../modules/maintenance/maintenance.routes';
import { AdminRoutes } from '../modules/admin/admin.routes';
import { UploadsRoutes } from '../modules/uploads/uploads.routes';
import { NotificationsRoutes } from '../modules/notifications/notifications.routes';

const router = Router();

const moduleRoutes = [
    { path: '/auth', route: AuthRoutes },
    { path: '/users', route: UsersRoutes },
    { path: '/properties', route: PropertiesRoutes },
    { path: '/rooms', route: RoomsRoutes },
    { path: '/roommates', route: RoommateRoutes },
    { path: '/viewings', route: ViewingsRoutes },
    { path: '/applications', route: ApplicationsRoutes },
    { path: '/tenancies', route: TenanciesRoutes },
    { path: '/payments', route: PaymentsRoutes },
    { path: '/maintenance', route: MaintenanceRoutes },
    { path: '/admin', route: AdminRoutes },
    { path: '/uploads', route: UploadsRoutes },
    { path: '/notifications', route: NotificationsRoutes },
];

moduleRoutes.forEach(({ path, route }) => router.use(path, route));

export default router;
