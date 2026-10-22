// prisma/seed.ts
import { PrismaClient, EventCategory, CarpoolType, ItemStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding CampusHub database...');

  // ─── Users ──────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Demo1234!', 12);

  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'demo@campus.edu' },
      update: {},
      create: {
        email: 'demo@campus.edu',
        passwordHash,
        name: 'Alex Rivera',
        username: 'alexrivera',
        avatarEmoji: '🚀',
        bio: 'CS student passionate about AI and open-source. Always looking for study partners!',
        department: 'Computer Science',
        yearOfStudy: 'YEAR_3',
        isEmailVerified: true,
        notificationSettings: { create: {} },
      },
    }),
    prisma.user.upsert({
      where: { email: 'sara@campus.edu' },
      update: {},
      create: {
        email: 'sara@campus.edu',
        passwordHash,
        name: 'Sara Chen',
        username: 'sarachen',
        avatarEmoji: '✨',
        bio: 'Data Science & Math double major. Coffee enthusiast ☕',
        department: 'Data Science',
        yearOfStudy: 'YEAR_2',
        isEmailVerified: true,
        notificationSettings: { create: {} },
      },
    }),
    prisma.user.upsert({
      where: { email: 'omar@campus.edu' },
      update: {},
      create: {
        email: 'omar@campus.edu',
        passwordHash,
        name: 'Omar Hassan',
        username: 'omarhassan',
        avatarEmoji: '🎯',
        bio: 'Electrical Engineering senior. Robotics club president.',
        department: 'Electrical Engineering',
        yearOfStudy: 'YEAR_4',
        isEmailVerified: true,
        notificationSettings: { create: {} },
      },
    }),
    prisma.user.upsert({
      where: { email: 'priya@campus.edu' },
      update: {},
      create: {
        email: 'priya@campus.edu',
        passwordHash,
        name: 'Priya Sharma',
        username: 'priyasharma',
        avatarEmoji: '🌟',
        bio: 'Biology & pre-med. Love hiking and campus events.',
        department: 'Biology',
        yearOfStudy: 'YEAR_2',
        isEmailVerified: true,
        notificationSettings: { create: {} },
      },
    }),
    prisma.user.upsert({
      where: { email: 'jake@campus.edu' },
      update: {},
      create: {
        email: 'jake@campus.edu',
        passwordHash,
        name: 'Jake Thompson',
        username: 'jakethompson',
        avatarEmoji: '🏀',
        bio: 'Business Admin. Entrepreneur club lead.',
        department: 'Business Administration',
        yearOfStudy: 'YEAR_3',
        isEmailVerified: true,
        notificationSettings: { create: {} },
      },
    }),
  ]);

  const [alex, sara, omar, priya, jake] = users;
  console.log(`✅ Created ${users.length} users`);

  // ─── Study Groups ───────────────────────────────────────────
  const studyGroups = await Promise.all([
    prisma.studyGroup.upsert({
      where: { id: 'sg-ai-ml-001' },
      update: {},
      create: {
        id: 'sg-ai-ml-001',
        ownerId: alex.id,
        title: 'AI & Machine Learning Study Circle',
        subject: 'Computer Science',
        description: 'Weekly sessions covering ML fundamentals, PyTorch, and paper readings. Exam prep included!',
        tags: ['machine-learning', 'python', 'exam-prep'],
        maxMembers: 15,
        schedule: 'Tuesdays & Thursdays 6–8pm',
        location: 'Library Room 204',
        coverColor: '#A259FF',
        members: {
          create: [
            { userId: alex.id, isAdmin: true },
            { userId: sara.id },
            { userId: omar.id },
          ],
        },
        resources: {
          create: [
            { uploadedById: alex.id, title: 'ML Cheat Sheet', url: 'https://example.com/ml-cheat.pdf', type: 'pdf' },
            { uploadedById: sara.id, title: 'PyTorch Docs', url: 'https://pytorch.org/docs', type: 'link' },
          ],
        },
      },
    }),
    prisma.studyGroup.upsert({
      where: { id: 'sg-calc-002' },
      update: {},
      create: {
        id: 'sg-calc-002',
        ownerId: sara.id,
        title: 'Calculus III Survivors',
        subject: 'Mathematics',
        description: 'Tackling multivariable calculus together. Past papers, office hours recap.',
        tags: ['calculus', 'math', 'final-exam'],
        maxMembers: 10,
        schedule: 'Mondays 7pm',
        location: 'Math Building 101',
        coverColor: '#5CE1FF',
        members: {
          create: [
            { userId: sara.id, isAdmin: true },
            { userId: priya.id },
          ],
        },
      },
    }),
    prisma.studyGroup.upsert({
      where: { id: 'sg-circuits-003' },
      update: {},
      create: {
        id: 'sg-circuits-003',
        ownerId: omar.id,
        title: 'Circuit Design & Embedded Systems',
        subject: 'Electrical Engineering',
        description: 'Hands-on PCB design, Arduino projects, and exam prep for EE undergrads.',
        tags: ['circuits', 'arduino', 'pcb', 'project'],
        maxMembers: 12,
        schedule: 'Wednesdays 5pm',
        location: 'EE Lab B',
        coverColor: '#FF8C42',
        members: {
          create: [{ userId: omar.id, isAdmin: true }],
        },
      },
    }),
    prisma.studyGroup.upsert({
      where: { id: 'sg-bio-004' },
      update: {},
      create: {
        id: 'sg-bio-004',
        ownerId: priya.id,
        title: 'Molecular Biology & Pre-Med Prep',
        subject: 'Biology',
        description: 'MCAT prep + molecular bio coursework. Weekly quizzes and flashcard sessions.',
        tags: ['biology', 'mcat', 'pre-med'],
        maxMembers: 8,
        schedule: 'Sundays 3pm',
        location: 'Science Hall 302',
        coverColor: '#FF5C5C',
        members: {
          create: [
            { userId: priya.id, isAdmin: true },
            { userId: jake.id },
          ],
        },
      },
    }),
  ]);
  console.log(`✅ Created ${studyGroups.length} study groups`);

  // ─── Chat Rooms ─────────────────────────────────────────────
  const chatRooms = await Promise.all([
    prisma.chatRoom.upsert({
      where: { slug: 'ai-machine-learning' },
      update: {},
      create: {
        ownerId: alex.id,
        name: 'AI & Machine Learning',
        slug: 'ai-machine-learning',
        description: 'Discuss AI research, share resources, find collaborators',
        emoji: '🤖',
        accentColor: '#A259FF',
        members: {
          create: [
            { userId: alex.id, isAdmin: true },
            { userId: sara.id },
            { userId: omar.id },
          ],
        },
      },
    }),
    prisma.chatRoom.upsert({
      where: { slug: 'campus-general' },
      update: {},
      create: {
        ownerId: jake.id,
        name: 'Campus General',
        slug: 'campus-general',
        description: 'General campus chat — announcements, questions, vibes',
        emoji: '🎓',
        accentColor: '#C8F135',
        members: {
          create: [
            { userId: jake.id, isAdmin: true },
            { userId: alex.id },
            { userId: sara.id },
            { userId: priya.id },
            { userId: omar.id },
          ],
        },
      },
    }),
    prisma.chatRoom.upsert({
      where: { slug: 'housing-marketplace' },
      update: {},
      create: {
        ownerId: sara.id,
        name: 'Housing & Marketplace',
        slug: 'housing-marketplace',
        description: 'Sublets, room swaps, sell/buy campus stuff',
        emoji: '🏠',
        accentColor: '#FF8C42',
        members: {
          create: [
            { userId: sara.id, isAdmin: true },
            { userId: priya.id },
            { userId: jake.id },
          ],
        },
      },
    }),
    prisma.chatRoom.upsert({
      where: { slug: 'career-internships' },
      update: {},
      create: {
        ownerId: jake.id,
        name: 'Careers & Internships',
        slug: 'career-internships',
        description: 'Job postings, resume reviews, interview prep',
        emoji: '💼',
        accentColor: '#5CE1FF',
        members: {
          create: [
            { userId: jake.id, isAdmin: true },
            { userId: alex.id },
            { userId: omar.id },
          ],
        },
      },
    }),
  ]);

  // Seed some messages
  const generalRoom = chatRooms[1];
  await prisma.message.createMany({
    data: [
      { roomId: generalRoom.id, senderId: jake.id, content: 'Hey everyone! Welcome to Campus General 👋' },
      { roomId: generalRoom.id, senderId: sara.id, content: 'So excited for the hackathon next week! Who\'s forming teams?' },
      { roomId: generalRoom.id, senderId: alex.id, content: 'I\'m in! Looking for 2 more people. DM me if interested 🚀' },
      { roomId: generalRoom.id, senderId: omar.id, content: 'Has anyone finished the EE assignment due Friday?' },
      { roomId: generalRoom.id, senderId: priya.id, content: 'Reminder: Study group for bio is Sunday 3pm @ Sci Hall 302 🌿' },
    ],
  });
  console.log(`✅ Created ${chatRooms.length} chat rooms with messages`);

  // ─── Carpools ───────────────────────────────────────────────
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(8, 0, 0, 0);

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(17, 30, 0, 0);

  await prisma.carpool.createMany({
    skipDuplicates: true,
    data: [
      {
        driverId: alex.id,
        type: CarpoolType.OFFERING,
        origin: 'Downtown Apartments',
        destination: 'North Campus',
        originLat: 40.7128, originLng: -74.006,
        destLat: 40.7282, destLng: -73.9942,
        departureTime: tomorrow,
        seatsTotal: 3, seatsLeft: 2,
        pricePerSeat: 5,
        notes: 'Leaving from Oak Street corner. 5 min late OK.',
        recurringDays: ['Mon', 'Wed', 'Fri'],
      },
      {
        driverId: omar.id,
        type: CarpoolType.OFFERING,
        origin: 'Riverside District',
        destination: 'Engineering Campus',
        departureTime: nextWeek,
        seatsTotal: 4, seatsLeft: 3,
        pricePerSeat: 0,
        notes: 'Free ride! Just fill the car 🙂',
        recurringDays: ['Tue', 'Thu'],
      },
      {
        driverId: priya.id,
        type: CarpoolType.LOOKING,
        origin: 'Westside Dorms',
        destination: 'Medical Campus',
        departureTime: tomorrow,
        seatsTotal: 1, seatsLeft: 1,
        notes: 'Looking for someone heading to med campus early morning.',
      },
    ],
  });
  console.log('✅ Created carpools');

  // ─── Lost & Found ────────────────────────────────────────────
  await prisma.lostFoundItem.createMany({
    skipDuplicates: true,
    data: [
      {
        reporterId: sara.id,
        status: ItemStatus.LOST,
        title: 'AirPods Pro (white case)',
        description: 'Lost near the library main entrance on Tuesday. Has a small scratch on the lid.',
        category: 'Electronics',
        location: 'Main Library',
        locationLat: 40.7282, locationLng: -73.9942,
        reward: '$20 reward',
      },
      {
        reporterId: jake.id,
        status: ItemStatus.FOUND,
        title: 'Student ID Card',
        description: 'Found on the bench outside the Student Union. Name on card: M. Johnson.',
        category: 'ID / Cards',
        location: 'Student Union Building',
        contactInfo: 'Text Jake: 555-0100',
      },
      {
        reporterId: omar.id,
        status: ItemStatus.LOST,
        title: 'Navy Blue Backpack',
        description: 'JanSport backpack with laptop, textbooks, and charger inside. Left in EE Lab B.',
        category: 'Bags',
        location: 'Electrical Engineering Lab B',
      },
      {
        reporterId: priya.id,
        status: ItemStatus.FOUND,
        title: 'Silver Water Bottle',
        description: 'Hydro Flask, found in Biology lecture hall after Thursday class.',
        category: 'Drinkware',
        location: 'Biology Building Room 201',
      },
    ],
  });
  console.log('✅ Created lost & found items');

  // ─── Events ─────────────────────────────────────────────────
  const event1Start = new Date();
  event1Start.setDate(event1Start.getDate() + 3);
  event1Start.setHours(14, 0, 0, 0);

  const event2Start = new Date();
  event2Start.setDate(event2Start.getDate() + 5);
  event2Start.setHours(10, 0, 0, 0);

  const event3Start = new Date();
  event3Start.setDate(event3Start.getDate() + 10);
  event3Start.setHours(18, 0, 0, 0);

  const event4Start = new Date();
  event4Start.setDate(event4Start.getDate() + 14);
  event4Start.setHours(9, 0, 0, 0);

  const events = await Promise.all([
    prisma.event.create({
      data: {
        organizerId: alex.id,
        title: 'Spring Hackathon 2025 🚀',
        description: 'Build something incredible in 24 hours! Teams of 2–4. Prizes for top 3 projects. Food & coffee provided.',
        category: EventCategory.ACADEMIC,
        location: 'Engineering Innovation Center',
        startTime: event1Start,
        endTime: new Date(event1Start.getTime() + 24 * 60 * 60 * 1000),
        maxAttendees: 100,
        isFeatured: true,
        tags: ['hackathon', 'coding', 'prizes'],
        rsvps: {
          create: [
            { userId: alex.id, status: 'GOING' },
            { userId: sara.id, status: 'GOING' },
            { userId: omar.id, status: 'MAYBE' },
          ],
        },
      },
    }),
    prisma.event.create({
      data: {
        organizerId: priya.id,
        title: 'Campus Wellness Fair 🌿',
        description: 'Mental health resources, free screenings, yoga session, and wellness workshops.',
        category: EventCategory.SOCIAL,
        location: 'Campus Quad',
        startTime: event2Start,
        endTime: new Date(event2Start.getTime() + 4 * 60 * 60 * 1000),
        tags: ['wellness', 'mental-health', 'free'],
        rsvps: {
          create: [
            { userId: priya.id, status: 'GOING' },
            { userId: jake.id, status: 'GOING' },
          ],
        },
      },
    }),
    prisma.event.create({
      data: {
        organizerId: jake.id,
        title: 'Tech Career Fair — Fall Edition',
        description: '40+ companies recruiting. Bring your resume! Business casual attire.',
        category: EventCategory.CAREER,
        location: 'Student Union Ballroom',
        startTime: event3Start,
        endTime: new Date(event3Start.getTime() + 5 * 60 * 60 * 1000),
        maxAttendees: 500,
        isFeatured: true,
        tags: ['career', 'jobs', 'internships', 'networking'],
        rsvps: {
          create: [
            { userId: jake.id, status: 'GOING' },
            { userId: alex.id, status: 'GOING' },
            { userId: omar.id, status: 'GOING' },
          ],
        },
      },
    }),
    prisma.event.create({
      data: {
        organizerId: omar.id,
        title: 'Robotics Workshop: Build Your First Robot',
        description: 'Beginner-friendly workshop. Arduino kits provided. No experience needed!',
        category: EventCategory.WORKSHOP,
        location: 'Maker Space, EE Building',
        startTime: event4Start,
        endTime: new Date(event4Start.getTime() + 3 * 60 * 60 * 1000),
        maxAttendees: 20,
        tags: ['robotics', 'workshop', 'arduino', 'beginner'],
        rsvps: {
          create: [
            { userId: omar.id, status: 'GOING' },
            { userId: sara.id, status: 'GOING' },
          ],
        },
      },
    }),
  ]);
  console.log(`✅ Created ${events.length} events`);

  // ─── Notifications ───────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      {
        userId: alex.id,
        type: 'MESSAGE',
        title: '💬 New message in AI & ML',
        body: 'Sara: Hey, can you share the PyTorch notes?',
        data: { roomSlug: 'ai-machine-learning' },
      },
      {
        userId: alex.id,
        type: 'EVENT_REMINDER',
        title: '📅 Hackathon in 3 days!',
        body: 'Spring Hackathon 2025 starts in 3 days. You\'re going!',
        data: { eventId: events[0].id },
      },
      {
        userId: sara.id,
        type: 'STUDY_GROUP_JOIN',
        title: '👥 New member joined',
        body: 'Omar joined your study group "Calculus III Survivors"',
        data: { groupId: 'sg-calc-002' },
      },
    ],
  });
  console.log('✅ Created notifications');

  console.log('\n🎉 Seed complete! You can log in with:');
  console.log('   Email: demo@campus.edu | Password: Demo1234!');
  console.log('   Email: sara@campus.edu | Password: Demo1234!');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
