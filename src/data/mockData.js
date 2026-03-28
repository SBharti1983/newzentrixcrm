// ─── Mock Users ───────────────────────────────────────────────────
export const USERS = [
  { id: 3, name: 'Rohan Kumar', role: 'agent', email: 'rohan@zentrix.com', avatar: 'RK', dept: 'Sales' },
  { id: 2, name: 'Priya Mehta', role: 'sales_manager', email: 'priya@zentrix.com', avatar: 'PM', dept: 'Sales' },
  { id: 1, name: 'Arjun Sharma', role: 'admin', email: 'arjun@zentrix.com', avatar: 'AS', dept: 'Management' },
  { id: 4, name: 'Neha Gupta', role: 'agent', email: 'neha@zentrix.com', avatar: 'NG', dept: 'Sales' },
  { id: 5, name: 'Vikram Singh', role: 'agent', email: 'vikram@zentrix.com', avatar: 'VS', dept: 'Sales' },
];

export const CURRENT_USER = USERS[0];

// ─── Mock Leads ───────────────────────────────────────────────────
export const LEADS_DATA = [
  { id: 1, name: 'Rajesh Kumar', email: 'rajesh.kumar@gmail.com', phone: '+91 98765 43210', source: 'Website', stage: 'New', budget: '₹85L', propertyType: '3BHK', project: 'Zentrix Heights', assignedTo: 3, lastContact: '2026-02-18', score: 78, notes: 'Interested in sea-facing units.', city: 'Mumbai' },
  { id: 2, name: 'Anita Patel', email: 'anita.patel@yahoo.com', phone: '+91 87654 32109', source: 'Referral', stage: 'Contacted', budget: '₹1.2Cr', propertyType: '4BHK', project: 'Zentrix Residences', assignedTo: 4, lastContact: '2026-02-17', score: 92, notes: 'High-priority lead, ready to invest.', city: 'Bangalore' },
  { id: 3, name: 'Suresh Bhat', email: 'suresh.bhat@hotmail.com', phone: '+91 76543 21098', source: 'Social Media', stage: 'Qualified (MQL)', budget: '₹60L', propertyType: '2BHK', project: 'Zentrix Park', assignedTo: 3, lastContact: '2026-02-16', score: 65, notes: 'Wants to visit on weekend.', city: 'Pune' },
  { id: 4, name: 'Divya Nair', email: 'divya.nair@outlook.com', phone: '+91 65432 10987', source: 'Walk-in', stage: 'Sales Qualified (SQL)', budget: '₹95L', propertyType: '3BHK', project: 'Zentrix Heights', assignedTo: 5, lastContact: '2026-02-15', score: 88, notes: 'Negotiating on floor preference.', city: 'Mumbai' },
  { id: 5, name: 'Kiran Reddy', email: 'kiran.reddy@gmail.com', phone: '+91 54321 09876', source: 'PropTech', stage: 'Won', budget: '₹1.5Cr', propertyType: 'Villa', project: 'Zentrix Villas', assignedTo: 4, lastContact: '2026-02-14', score: 95, notes: 'Deal closed. Booking confirmed.', city: 'Hyderabad' },
  { id: 6, name: 'Mohan Das', email: 'mohan.das@gmail.com', phone: '+91 43210 98765', source: 'Website', stage: 'Lost', budget: '₹70L', propertyType: '2BHK', project: 'Zentrix Park', assignedTo: 3, lastContact: '2026-02-10', score: 30, notes: 'Budget mismatch, went to competitor.', city: 'Chennai' },
  { id: 7, name: 'Sunita Joshi', email: 'sunita.joshi@mail.com', phone: '+91 32109 87654', source: 'Referral', stage: 'New', budget: '₹45L', propertyType: '1BHK', project: 'Zentrix Lite', assignedTo: 5, lastContact: '2026-02-19', score: 55, notes: 'First-time buyer, needs guidance.', city: 'Pune' },
  { id: 8, name: 'Arun Kapoor', email: 'arun.kapoor@email.com', phone: '+91 21098 76543', source: 'Walk-in', stage: 'Contacted', budget: '₹2Cr', propertyType: 'Penthouse', project: 'Zentrix Elite', assignedTo: 4, lastContact: '2026-02-18', score: 85, notes: 'Ultra premium segment interest.', city: 'Mumbai' },
  { id: 9, name: 'Priti Shah', email: 'priti.shah@net.com', phone: '+91 11987 65432', source: 'Social Media', stage: 'Qualified (MQL)', budget: '₹80L', propertyType: '3BHK', project: 'Zentrix Heights', assignedTo: 3, lastContact: '2026-02-17', score: 71, notes: 'Liked the amenities brochure.', city: 'Ahmedabad' },
  { id: 10, name: 'Dev Malhotra', email: 'dev.malhotra@corp.in', phone: '+91 99876 54321', source: 'PropTech', stage: 'Sales Qualified (SQL)', budget: '₹1.1Cr', propertyType: '4BHK', project: 'Zentrix Residences', assignedTo: 5, lastContact: '2026-02-16', score: 90, notes: 'Comparing with another project.', city: 'Delhi' },
];

// ─── Mock Properties/Projects ──────────────────────────────────────
export const PROJECTS_DATA = [
  { id: 1, name: 'Zentrix Heights', location: 'Andheri West, Mumbai', type: 'Residential', units: 120, available: 34, priceRange: '₹75L – ₹1.3Cr', status: 'Active', completion: '2026-12', image: '🏢', amenities: ['Pool', 'Gym', 'Clubhouse', 'Parking', 'Security'], description: 'Premium high-rise with panoramic views. 2, 3 & 4 BHK configurations.' },
  { id: 2, name: 'Zentrix Residences', location: 'Whitefield, Bangalore', type: 'Residential', units: 84, available: 18, priceRange: '₹90L – ₹1.8Cr', status: 'Active', completion: '2026-06', image: '🏗️', amenities: ['Pool', 'Gym', 'Garden', 'Co-working', 'EV Charging'], description: 'Gated community with world-class amenities in the heart of tech corridor.' },
  { id: 3, name: 'Zentrix Park', location: 'Hinjewadi, Pune', type: 'Residential', units: 240, available: 72, priceRange: '₹45L – ₹85L', status: 'Active', completion: '2027-03', image: '🌇', amenities: ['Park', 'Gym', 'Parking', 'Security', 'Kids Zone'], description: 'Affordable luxury homes designed for young professionals and families.' },
  { id: 4, name: 'Zentrix Villas', location: 'Jubilee Hills, Hyderabad', type: 'Villa', units: 48, available: 12, priceRange: '₹1.5Cr – ₹3Cr', status: 'Active', completion: '2026-09', image: '🏡', amenities: ['Private Pool', 'Garden', 'Smart Home', 'Club', 'Security'], description: 'Exclusive independent villas with private outdoor spaces and luxury finishes.' },
  { id: 5, name: 'Zentrix Lite', location: 'Wakad, Pune', type: 'Residential', units: 180, available: 96, priceRange: '₹35L – ₹60L', status: 'Active', completion: '2027-06', image: '🏘️', amenities: ['Gym', 'Parking', 'Security', 'Garden'], description: 'Smart studio and 1 BHK homes for first-time buyers and investors.' },
  { id: 6, name: 'Zentrix Elite', location: 'Bandra, Mumbai', type: 'Luxury', units: 36, available: 8, priceRange: '₹2Cr – ₹5Cr', status: 'Pre-launch', completion: '2027-12', image: '💎', amenities: ['Sky Lounge', 'Concierge', 'Spa', 'Private Theater', 'Valet'], description: 'Ultra-luxury sky residences in the most coveted address in Mumbai.' },
  { id: 7, name: 'Zentrix Commercial Hub', location: 'Cyber City, Gurugram', type: 'Commercial', units: 60, available: 40, priceRange: '₹80L – ₹2Cr', status: 'Active', completion: '2026-11', image: '🏬', amenities: ['Food Court', 'Parking', 'High-Speed Lifts', 'Conference Rooms'], description: 'Grade-A commercial spaces in Gurugram\'s premium business district.' },
];

// ─── Inventory / Units ──────────────────────────────────────────────
export const UNITS_DATA = [
  { id: 1, projectId: 1, unitNo: 'A-1201', type: '3BHK', floor: 12, area: 1450, price: '₹95L', status: 'Available', facing: 'East', parking: 2 },
  { id: 2, projectId: 1, unitNo: 'B-0802', type: '2BHK', floor: 8, area: 1080, price: '₹78L', status: 'Sold', facing: 'West', parking: 1 },
  { id: 3, projectId: 1, unitNo: 'A-1402', type: '4BHK', floor: 14, area: 2100, price: '₹1.3Cr', status: 'Available', facing: 'North', parking: 2 },
  { id: 4, projectId: 2, unitNo: 'C-0501', type: '3BHK', floor: 5, area: 1600, price: '₹1.1Cr', status: 'Booked', facing: 'South', parking: 2 },
  { id: 5, projectId: 2, unitNo: 'D-0901', type: '4BHK', floor: 9, area: 2200, price: '₹1.8Cr', status: 'Available', facing: 'East', parking: 3 },
  { id: 6, projectId: 4, unitNo: 'V-001', type: 'Villa', floor: 0, area: 3200, price: '₹2.5Cr', status: 'Available', facing: 'North', parking: 3 },
  { id: 7, projectId: 4, unitNo: 'V-002', type: 'Villa', floor: 0, area: 2800, price: '₹1.9Cr', status: 'Sold', facing: 'East', parking: 2 },
  { id: 8, projectId: 6, unitNo: 'SKY-3501', type: 'Penthouse', floor: 35, area: 4500, price: '₹5Cr', status: 'Available', facing: 'Sea View', parking: 4 },
];

// ─── Customers ────────────────────────────────────────────────────
export const CUSTOMERS_DATA = [
  { id: 1, name: 'Kiran Reddy', email: 'kiran.reddy@gmail.com', phone: '+91 54321 09876', city: 'Hyderabad', segment: 'Premium', totalPurchased: '₹1.5Cr', projectsBooked: 1, joinDate: '2025-11-20', status: 'Active', avatar: 'KR', lastInteraction: '2026-02-14', interactionCount: 8 },
  { id: 2, name: 'Anita Patel', email: 'anita.patel@yahoo.com', phone: '+91 87654 32109', city: 'Bangalore', segment: 'Premium', totalPurchased: '₹1.2Cr', projectsBooked: 1, joinDate: '2026-01-10', status: 'Active', avatar: 'AP', lastInteraction: '2026-02-17', interactionCount: 6 },
  { id: 3, name: 'Divya Nair', email: 'divya.nair@outlook.com', phone: '+91 65432 10987', city: 'Mumbai', segment: 'Mid', totalPurchased: '₹0', projectsBooked: 0, joinDate: '2026-01-25', status: 'Prospect', avatar: 'DN', lastInteraction: '2026-02-15', interactionCount: 5 },
  { id: 4, name: 'Arun Kapoor', email: 'arun.kapoor@email.com', phone: '+91 21098 76543', city: 'Mumbai', segment: 'Ultra Premium', totalPurchased: '₹0', projectsBooked: 0, joinDate: '2026-02-01', status: 'Prospect', avatar: 'AK', lastInteraction: '2026-02-18', interactionCount: 3 },
  { id: 5, name: 'Dev Malhotra', email: 'dev.malhotra@corp.in', phone: '+91 99876 54321', city: 'Delhi', segment: 'Premium', totalPurchased: '₹0', projectsBooked: 0, joinDate: '2026-02-05', status: 'Warm', avatar: 'DM', lastInteraction: '2026-02-16', interactionCount: 4 },
];

// ─── Interactions / History ────────────────────────────────────────
export const INTERACTIONS_DATA = [
  { id: 1, customerId: 1, type: 'Call', date: '2026-02-14', agent: 'Priya Mehta', note: 'Finalized villa V-002 booking. Documentation to follow.', duration: '28 min' },
  { id: 2, customerId: 1, type: 'Email', date: '2026-02-10', agent: 'Neha Gupta', note: 'Sent payment schedule and registration details.', duration: null },
  { id: 3, customerId: 1, type: 'Site Visit', date: '2026-02-05', agent: 'Priya Mehta', note: 'Customer visited Zentrix Villas. Very impressed with construction quality.', duration: '2.5 hrs' },
  { id: 4, customerId: 2, type: 'Call', date: '2026-02-17', agent: 'Neha Gupta', note: 'Discussed 4BHK availability in Zentrix Residences. Very interested.', duration: '15 min' },
  { id: 5, customerId: 2, type: 'WhatsApp', date: '2026-02-15', agent: 'Neha Gupta', note: 'Sent floor plan and virtual tour link.', duration: null },
  { id: 6, customerId: 3, type: 'Call', date: '2026-02-15', agent: 'Vikram Singh', note: 'Negotiating on 3BHK price. Wants 5% discount.', duration: '22 min' },
  { id: 7, customerId: 4, type: 'Walk-in', date: '2026-02-18', agent: 'Neha Gupta', note: 'Visited showroom, interested in penthouse SKY-3501.', duration: '1 hr' },
  { id: 8, customerId: 5, type: 'Email', date: '2026-02-16', agent: 'Vikram Singh', note: 'Sent comparison document between Zentrix Residences and Zentrix Elite.', duration: null },
];

// ─── Follow-ups ───────────────────────────────────────────────────
export const FOLLOWUPS_DATA = [
  { id: 1, leadId: 1, leadName: 'Rajesh Kumar', type: 'Call', date: '2026-02-20', time: '10:00', agent: 3, agentName: 'Rohan Verma', priority: 'High', note: 'Discuss final pricing for A-1201', status: 'Pending' },
  { id: 2, leadId: 2, leadName: 'Anita Patel', type: 'Site Visit', date: '2026-02-21', time: '11:00', agent: 4, agentName: 'Neha Gupta', priority: 'High', note: 'Site visit to Zentrix Residences', status: 'Pending' },
  { id: 3, leadId: 7, leadName: 'Sunita Joshi', type: 'Email', date: '2026-02-20', time: '14:00', agent: 5, agentName: 'Vikram Singh', priority: 'Medium', note: 'Send 1BHK brochure and financing options', status: 'Pending' },
  { id: 4, leadId: 9, leadName: 'Priti Shah', type: 'Call', date: '2026-02-22', time: '15:30', agent: 3, agentName: 'Rohan Verma', priority: 'Medium', note: 'Follow up on Heights visit', status: 'Pending' },
  { id: 5, leadId: 10, leadName: 'Dev Malhotra', type: 'WhatsApp', date: '2026-02-19', time: '09:00', agent: 5, agentName: 'Vikram Singh', priority: 'High', note: 'Share latest pricing update', status: 'Completed' },
  { id: 6, leadId: 4, leadName: 'Divya Nair', type: 'Call', date: '2026-02-23', time: '16:00', agent: 5, agentName: 'Vikram Singh', priority: 'High', note: 'Final negotiation call', status: 'Pending' },
];

// ─── Site Visits ──────────────────────────────────────────────────
export const SITE_VISITS_DATA = [
  { id: 1, leadId: 3, leadName: 'Suresh Bhat', projectId: 3, projectName: 'Zentrix Park', date: '2026-02-22', time: '10:00', agent: 3, agentName: 'Rohan Verma', transport: 'Agent Car', status: 'Scheduled', notes: 'Customer coming from Hinjewadi office' },
  { id: 2, leadId: 2, leadName: 'Anita Patel', projectId: 2, projectName: 'Zentrix Residences', date: '2026-02-21', time: '11:00', agent: 4, agentName: 'Neha Gupta', transport: 'Self', status: 'Scheduled', notes: 'Interested in 4BHK on higher floors' },
  { id: 3, leadId: 9, leadName: 'Priti Shah', projectId: 1, projectName: 'Zentrix Heights', date: '2026-02-16', time: '15:00', agent: 3, agentName: 'Rohan Verma', transport: 'Agent Car', status: 'Completed', notes: 'Liked the amenities, needs pricing clarification' },
  { id: 4, leadId: 1, leadName: 'Rajesh Kumar', projectId: 1, projectName: 'Zentrix Heights', date: '2026-02-25', time: '09:30', agent: 3, agentName: 'Rohan Verma', transport: 'Self', status: 'Scheduled', notes: 'Wants to see sea-facing units on 12th floor' },
];

// ─── Bookings ─────────────────────────────────────────────────────
export const BOOKINGS_DATA = [
  { id: 1, customerId: 1, customerName: 'Kiran Reddy', projectId: 4, projectName: 'Zentrix Villas', unitNo: 'V-002', amount: '₹1.5Cr', bookingDate: '2026-02-14', tokenAmount: '₹7.5L', status: 'Confirmed', agent: 4, agentName: 'Neha Gupta', paymentPlan: 'Construction Linked', tokenCollected: true, tokenDate: '2026-02-14', tokenMode: 'NEFT/RTGS', tokenRef: 'UTR20260214081234' },
  { id: 2, customerId: 2, customerName: 'Anita Patel', projectId: 2, projectName: 'Zentrix Residences', unitNo: 'C-0501', amount: '₹1.1Cr', bookingDate: '2026-01-20', tokenAmount: '₹5.5L', status: 'Confirmed', agent: 4, agentName: 'Neha Gupta', paymentPlan: 'Down Payment', tokenCollected: true, tokenDate: '2026-01-20', tokenMode: 'Cheque', tokenRef: 'Cheque #204813' },
  { id: 3, customerId: 3, customerName: 'Divya Nair', projectId: 1, projectName: 'Zentrix Heights', unitNo: 'A-1201', amount: '₹95L', bookingDate: '2026-02-10', tokenAmount: '₹4.75L', status: 'Pending Docs', agent: 5, agentName: 'Vikram Singh', paymentPlan: 'EMI', tokenCollected: true, tokenDate: '2026-02-10', tokenMode: 'UPI', tokenRef: 'UPI-81234567' },
];

// ─── Analytics ────────────────────────────────────────────────────
export const MONTHLY_SALES = [
  { month: 'Sep', leads: 48, conversions: 6, revenue: 4.2 },
  { month: 'Oct', leads: 62, conversions: 9, revenue: 6.8 },
  { month: 'Nov', leads: 71, conversions: 11, revenue: 8.1 },
  { month: 'Dec', leads: 58, conversions: 8, revenue: 5.9 },
  { month: 'Jan', leads: 84, conversions: 14, revenue: 11.2 },
  { month: 'Feb', leads: 97, conversions: 17, revenue: 14.5 },
];

export const PIPELINE_STAGES = ['New', 'Contacted', 'Qualified (MQL)', 'Sales Qualified (SQL)', 'Won', 'Lost', 'Disqualified'];

export const LEAD_SOURCES = [
  { name: 'Website', value: 35 },
  { name: 'Referral', value: 28 },
  { name: 'Social Media', value: 20 },
  { name: 'Walk-in', value: 12 },
  { name: 'PropTech', value: 5 },
];

export const AGENT_PERFORMANCE = [
  { name: 'Neha Gupta', leads: 42, conversions: 8, revenue: '₹6.2Cr' },
  { name: 'Vikram Singh', leads: 38, conversions: 6, revenue: '₹4.8Cr' },
  { name: 'Rohan Verma', leads: 31, conversions: 5, revenue: '₹3.6Cr' },
];

// ─── Channel Partners / Outside Brokers ────────────────────────────
export const CHANNEL_PARTNERS_DATA = [
  { id: 1, name: 'Sunil Brokers Pvt. Ltd.', contactPerson: 'Sunil Agarwal', email: 'sunil@sunilbrokers.com', phone: '+91 98100 11223', city: 'Mumbai', type: 'Firm', status: 'Active', commissionRate: 2.5, reraNo: 'MH12345678', joinDate: '2025-06-15', totalLeadsReferred: 24, convertedLeads: 8, totalEarnings: '₹14.2L', avatar: 'SB', rating: 4.5, assignedProjects: ['Zentrix Heights', 'Zentrix Elite'], notes: 'Top-performing broker in the western suburbs. Strong client network.' },
  { id: 2, name: 'Priya Realty Associates', contactPerson: 'Priya Kapoor', email: 'priya@priyarealty.in', phone: '+91 98200 44556', city: 'Bangalore', type: 'Individual', status: 'Active', commissionRate: 2.0, reraNo: 'KA98765432', joinDate: '2025-08-20', totalLeadsReferred: 18, convertedLeads: 5, totalEarnings: '₹8.4L', avatar: 'PK', rating: 4.2, assignedProjects: ['Zentrix Residences'], notes: 'Specializes in IT corridor clients. Very responsive.' },
  { id: 3, name: 'Horizon Properties', contactPerson: 'Rakesh Sharma', email: 'rakesh@horizonprop.com', phone: '+91 97300 77889', city: 'Pune', type: 'Firm', status: 'Active', commissionRate: 2.0, reraNo: 'MH87654321', joinDate: '2025-09-01', totalLeadsReferred: 31, convertedLeads: 10, totalEarnings: '₹11.5L', avatar: 'HS', rating: 4.8, assignedProjects: ['Zentrix Park', 'Zentrix Lite'], notes: 'Excellent footfall in Hinjewadi and Wakad areas.' },
  { id: 4, name: 'Capital Homes Network', contactPerson: 'Amit Joshi', email: 'amit@capitalhomes.in', phone: '+91 96400 33221', city: 'Delhi', type: 'Firm', status: 'Active', commissionRate: 2.5, reraNo: 'DL11223344', joinDate: '2025-07-10', totalLeadsReferred: 14, convertedLeads: 4, totalEarnings: '₹9.1L', avatar: 'AJ', rating: 3.9, assignedProjects: ['Zentrix Commercial Hub'], notes: 'Strong corporate client base in Gurugram and Noida.' },
  { id: 5, name: 'Goldline Real Estate', contactPerson: 'Fatima Sheikh', email: 'fatima@goldline.co.in', phone: '+91 95500 66778', city: 'Hyderabad', type: 'Individual', status: 'Inactive', commissionRate: 1.75, reraNo: 'TS55667788', joinDate: '2025-05-01', totalLeadsReferred: 9, convertedLeads: 2, totalEarnings: '₹3.8L', avatar: 'FS', rating: 3.5, assignedProjects: ['Zentrix Villas'], notes: 'Was active in Q3 2025. Follow-up required to reactivate.' },
  { id: 6, name: 'NRI Connections', contactPerson: 'Vivek Menon', email: 'vivek@nriconnections.com', phone: '+91 94600 55443', city: 'Mumbai', type: 'Firm', status: 'Active', commissionRate: 3.0, reraNo: 'MH22334455', joinDate: '2025-10-12', totalLeadsReferred: 7, convertedLeads: 3, totalEarnings: '₹12.6L', avatar: 'VM', rating: 4.6, assignedProjects: ['Zentrix Elite', 'Zentrix Heights'], notes: 'Focuses on NRI investors from UAE & UK. Luxury segment specialist.' },
];

export const CHANNEL_PARTNER_LEADS = [
  { id: 1, partnerId: 1, leadName: 'Ramesh Puri', phone: '+91 91234 56789', project: 'Zentrix Heights', budget: '₹90L', referralDate: '2026-01-15', status: 'Won', commissionPaid: '₹2.25L' },
  { id: 2, partnerId: 1, leadName: 'Seema Talwar', phone: '+91 92345 67890', project: 'Zentrix Elite', budget: '₹3.5Cr', referralDate: '2026-02-05', status: 'Sales Qualified (SQL)', commissionPaid: '—' },
  { id: 3, partnerId: 2, leadName: 'Nikhil Rao', phone: '+91 93456 78901', project: 'Zentrix Residences', budget: '₹1.1Cr', referralDate: '2026-01-20', status: 'Won', commissionPaid: '₹2.2L' },
  { id: 4, partnerId: 3, leadName: 'Ritu Saxena', phone: '+91 94567 89012', project: 'Zentrix Park', budget: '₹65L', referralDate: '2026-02-01', status: 'Qualified (MQL)', commissionPaid: '—' },
  { id: 5, partnerId: 3, leadName: 'Pankaj Desai', phone: '+91 95678 90123', project: 'Zentrix Lite', budget: '₹42L', referralDate: '2026-02-10', status: 'Won', commissionPaid: '₹0.84L' },
  { id: 6, partnerId: 6, leadName: 'Mohammed Al-Rashid', phone: '+971 50 123 4567', project: 'Zentrix Elite', budget: '₹4.2Cr', referralDate: '2026-02-08', status: 'Won', commissionPaid: '₹12.6L' },
  { id: 7, partnerId: 4, leadName: 'Sunita Batra', phone: '+91 96789 01234', project: 'Zentrix Commercial Hub', budget: '₹1.5Cr', referralDate: '2026-01-28', status: 'Contacted', commissionPaid: '—' },
];

// ─── Payment Plans ─────────────────────────────────────────────────
// These represent active payment plan schedules for each booking
export const PAYMENT_PLANS_DATA = [
  {
    id: 1, bookingId: 1, customerName: 'Kiran Reddy',
    projectName: 'Zentrix Villas', unitNo: 'V-002',
    planType: 'Construction Linked', totalAmount: 15000000,
    bookingDate: '2026-02-14', agentName: 'Neha Gupta',
  },
  {
    id: 2, bookingId: 2, customerName: 'Anita Patel',
    projectName: 'Zentrix Residences', unitNo: 'C-0501',
    planType: 'Down Payment', totalAmount: 11000000,
    bookingDate: '2026-01-20', agentName: 'Neha Gupta',
  },
  {
    id: 3, bookingId: 3, customerName: 'Divya Nair',
    projectName: 'Zentrix Heights', unitNo: 'A-1201',
    planType: 'EMI', totalAmount: 9500000,
    bookingDate: '2026-02-10', agentName: 'Vikram Singh',
  },
];

// ─── Installments ─────────────────────────────────────────────────
export const INSTALLMENTS_DATA = [
  // Kiran Reddy — Construction Linked (Booking 1 / Plan 1)
  { id: 101, planId: 1, bookingId: 1, customerName: 'Kiran Reddy', projectName: 'Zentrix Villas', unitNo: 'V-002', milestone: 'Token / Booking Amount', amount: 750000, dueDate: '2026-02-14', paidDate: '2026-02-14', status: 'Paid', receiptNote: 'UTR20260214081234' },
  { id: 102, planId: 1, bookingId: 1, customerName: 'Kiran Reddy', projectName: 'Zentrix Villas', unitNo: 'V-002', milestone: 'On Foundation Completion', amount: 1500000, dueDate: '2026-03-15', paidDate: '2026-03-14', status: 'Paid', receiptNote: 'NEFT-2026031450123' },
  { id: 103, planId: 1, bookingId: 1, customerName: 'Kiran Reddy', projectName: 'Zentrix Villas', unitNo: 'V-002', milestone: '1st Floor Slab', amount: 1500000, dueDate: '2026-05-01', paidDate: null, status: 'Upcoming', receiptNote: null },
  { id: 104, planId: 1, bookingId: 1, customerName: 'Kiran Reddy', projectName: 'Zentrix Villas', unitNo: 'V-002', milestone: '2nd Floor Slab', amount: 1500000, dueDate: '2026-07-01', paidDate: null, status: 'Upcoming', receiptNote: null },
  { id: 105, planId: 1, bookingId: 1, customerName: 'Kiran Reddy', projectName: 'Zentrix Villas', unitNo: 'V-002', milestone: 'Brickwork & Plastering', amount: 1500000, dueDate: '2026-09-01', paidDate: null, status: 'Upcoming', receiptNote: null },
  { id: 106, planId: 1, bookingId: 1, customerName: 'Kiran Reddy', projectName: 'Zentrix Villas', unitNo: 'V-002', milestone: 'Fittings & Finishes', amount: 1500000, dueDate: '2026-11-01', paidDate: null, status: 'Upcoming', receiptNote: null },
  { id: 107, planId: 1, bookingId: 1, customerName: 'Kiran Reddy', projectName: 'Zentrix Villas', unitNo: 'V-002', milestone: 'Possession', amount: 6750000, dueDate: '2026-12-01', paidDate: null, status: 'Upcoming', receiptNote: null },

  // Anita Patel — Down Payment (Booking 2 / Plan 2)
  { id: 201, planId: 2, bookingId: 2, customerName: 'Anita Patel', projectName: 'Zentrix Residences', unitNo: 'C-0501', milestone: 'Token / Booking Amount', amount: 550000, dueDate: '2026-01-20', paidDate: '2026-01-20', status: 'Paid', receiptNote: 'Cheque #204813' },
  { id: 202, planId: 2, bookingId: 2, customerName: 'Anita Patel', projectName: 'Zentrix Residences', unitNo: 'C-0501', milestone: 'Down Payment (40%)', amount: 4400000, dueDate: '2026-02-05', paidDate: null, status: 'Overdue', receiptNote: null },
  { id: 203, planId: 2, bookingId: 2, customerName: 'Anita Patel', projectName: 'Zentrix Residences', unitNo: 'C-0501', milestone: 'Remaining Balance at Possession', amount: 6050000, dueDate: '2026-06-30', paidDate: null, status: 'Upcoming', receiptNote: null },

  // Divya Nair — EMI (Booking 3 / Plan 3)
  { id: 301, planId: 3, bookingId: 3, customerName: 'Divya Nair', projectName: 'Zentrix Heights', unitNo: 'A-1201', milestone: 'Token / Booking Amount', amount: 475000, dueDate: '2026-02-10', paidDate: '2026-02-10', status: 'Paid', receiptNote: 'UPI-81234567' },
  { id: 302, planId: 3, bookingId: 3, customerName: 'Divya Nair', projectName: 'Zentrix Heights', unitNo: 'A-1201', milestone: 'Down Payment (20%)', amount: 1900000, dueDate: '2026-02-28', paidDate: null, status: 'Pending', receiptNote: null },
  { id: 303, planId: 3, bookingId: 3, customerName: 'Divya Nair', projectName: 'Zentrix Heights', unitNo: 'A-1201', milestone: 'Bank Loan Disbursement (70%)', amount: 6650000, dueDate: '2026-03-15', paidDate: null, status: 'Upcoming', receiptNote: null },
];

// ─── Agreements & Documents ──────────────────────────────────────────
export const AGREEMENTS_DATA = [
  {
    id: 1, bookingId: '1', customerName: 'Kiran Reddy',
    projectName: 'Zentrix Villas', unitNo: 'V-002',
    docName: 'Sale Agreement — Villa V-002', docType: 'Sale Agreement',
    status: 'Signed', uploadDate: '2026-02-16', uploadedBy: 'Neha Gupta',
    fileSize: '2.4 MB', fileName: 'sale_agreement_kiran_reddy.pdf',
    expiryDate: '', notes: 'Signed by both parties. Original with legal team.',
  },
  {
    id: 2, bookingId: '1', customerName: 'Kiran Reddy',
    projectName: 'Zentrix Villas', unitNo: 'V-002',
    docName: 'KYC Documents — Kiran Reddy', docType: 'KYC Documents',
    status: 'Signed', uploadDate: '2026-02-15', uploadedBy: 'Neha Gupta',
    fileSize: '1.1 MB', fileName: 'kyc_kiran_reddy.pdf',
    expiryDate: '2028-02-15', notes: 'Aadhar + PAN verified.',
  },
  {
    id: 3, bookingId: '1', customerName: 'Kiran Reddy',
    projectName: 'Zentrix Villas', unitNo: 'V-002',
    docName: 'Allotment Letter — V-002', docType: 'Allotment Letter',
    status: 'Signed', uploadDate: '2026-02-17', uploadedBy: 'Arjun Sharma',
    fileSize: '856 KB', fileName: 'allotment_letter_v002.pdf',
    expiryDate: '', notes: 'Issued and countersigned.',
  },
  {
    id: 4, bookingId: '2', customerName: 'Anita Patel',
    projectName: 'Zentrix Residences', unitNo: 'C-0501',
    docName: 'Sale Agreement — C-0501', docType: 'Sale Agreement',
    status: 'Pending Signature', uploadDate: '2026-01-22', uploadedBy: 'Neha Gupta',
    fileSize: '2.1 MB', fileName: 'sale_agreement_anita_patel.pdf',
    expiryDate: '', notes: 'Sent to customer for signature. Awaiting return.',
  },
  {
    id: 5, bookingId: '2', customerName: 'Anita Patel',
    projectName: 'Zentrix Residences', unitNo: 'C-0501',
    docName: 'KYC Documents — Anita Patel', docType: 'KYC Documents',
    status: 'Signed', uploadDate: '2026-01-21', uploadedBy: 'Neha Gupta',
    fileSize: '940 KB', fileName: 'kyc_anita_patel.pdf',
    expiryDate: '2028-01-21', notes: 'Verified.',
  },
  {
    id: 6, bookingId: '3', customerName: 'Divya Nair',
    projectName: 'Zentrix Heights', unitNo: 'A-1201',
    docName: 'Sale Agreement — A-1201', docType: 'Sale Agreement',
    status: 'Under Review', uploadDate: '2026-02-12', uploadedBy: 'Vikram Singh',
    fileSize: '1.9 MB', fileName: 'sale_agreement_divya_nair.pdf',
    expiryDate: '', notes: 'Under legal review. Expected clearance by Feb 25.',
  },
  {
    id: 7, bookingId: '3', customerName: 'Divya Nair',
    projectName: 'Zentrix Heights', unitNo: 'A-1201',
    docName: 'Loan Sanction Letter — HDFC', docType: 'Loan Sanction',
    status: 'Pending Signature', uploadDate: '2026-02-14', uploadedBy: 'Divya Nair',
    fileSize: '620 KB', fileName: 'hdfc_loan_sanction.pdf',
    expiryDate: '2026-08-14', notes: 'Sanctioned for ₹70L. Valid 6 months.',
  },
  {
    id: 8, bookingId: '1', customerName: 'Kiran Reddy',
    projectName: 'Zentrix Villas', unitNo: 'V-002',
    docName: 'Payment Receipt — Token', docType: 'Payment Receipt',
    status: 'Signed', uploadDate: '2026-02-14', uploadedBy: 'Neha Gupta',
    fileSize: '180 KB', fileName: 'token_receipt_kiran_reddy.pdf',
    expiryDate: '', notes: 'Token amount ₹7.5L. UTR: UTR20260214081234',
  },
];
