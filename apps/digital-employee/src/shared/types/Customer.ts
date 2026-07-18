export interface Customer {
    id: string;
    name: string;
    email: string;
    phone?: string;
    companyName?: string;
    address?: string;
    createdAt: Date;
    updatedAt?: Date;
}
