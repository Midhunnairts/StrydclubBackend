const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('../config/db');
const User = require('../models/User');
const Event = require('../models/Event');
const Registration = require('../models/Registration');

dotenv.config();

const seedData = async () => {
  try {
    await connectDB();

    // Clear existing database logs
    await User.deleteMany();
    await Event.deleteMany();
    await Registration.deleteMany();

    console.log('Database collections cleared...');

    // 1. Create default athlete user to match the dashboard screenshots
    const defaultUser = await User.create({
      name: 'midhun',
      email: 'midhun@strydclub.com',
      phone: '+91 9876543210',
      avatarUrl: '',
      favoriteSports: ['Running', 'Football', 'Badminton'],
      memberSince: 'January 2026',
      totalEvents: 12,
      eventsWon: 3,
      sportsPlayed: 3
    });

    console.log('Seeded default User...');

    // 2. Create the 7 premium events
    const events = await Event.create([
      {
        slug: 'weekend-5k-marathon',
        title: 'Weekend 5K Marathon',
        category: 'Running',
        description: 'Join us for an energetic 5K marathon through the scenic routes of Cubbon Park. Perfect for runners of all levels, this event celebrates fitness, community, and the joy of running together.',
        date: 'May 28, 2026',
        time: '6:00 AM',
        location: 'Cubbon Park, Bangalore',
        status: 'upcoming',
        price: 499,
        slotsFilled: 45,
        slotsTotal: 100,
        rules: [
          { text: 'Participants must arrive 30 minutes before start time' },
          { text: 'Valid ID required for registration verification' },
          { text: 'Running shoes mandatory - no casual footwear' },
          { text: 'Hydration stations available every kilometer' },
          { text: 'Medical support on standby throughout the route' }
        ],
        schedule: [
          { time: '5:30 AM', activity: 'Registration & Check-in' },
          { time: '5:50 AM', activity: 'Warm-up Session' },
          { time: '6:00 AM', activity: 'Race Begins' },
          { time: '7:30 AM', activity: 'Awards Ceremony' },
          { time: '8:00 AM', activity: 'Post-Race Refreshments' }
        ],
        participants: [
          { name: 'Rahul Sharma', role: 'Participant' },
          { name: 'Priya Desai', role: 'Participant' },
          { name: 'Amit Kumar', role: 'Participant' },
          { name: 'Sneha Reddy', role: 'Participant' }
        ],
        organizedBy: 'Strydclub Bangalore',
        contact: '+91 98765 43210'
      },
      {
        slug: 'inter-city-badminton-tournament',
        title: 'Inter-City Badminton Tournament',
        category: 'Badminton',
        description: 'Compete against the finest badminton players in the region. Showcase your smash, drop, and tactical brilliance in this high-intensity inter-city championship.',
        date: 'June 2, 2026',
        time: '9:00 AM',
        location: 'Sports Complex, Mumbai',
        status: 'upcoming',
        price: 350,
        slotsFilled: 12,
        slotsTotal: 32,
        rules: [
          { text: 'Yonex tournament grade shuttles will be provided' },
          { text: 'Standard BWF single-elimination rules apply' },
          { text: 'Non-marking court shoes are strictly mandatory' },
          { text: 'Please report to the referee 15 minutes before your match time' },
          { text: 'Decisions of the court referees are final' }
        ],
        schedule: [
          { time: '8:30 AM', activity: 'Draws Announcement & Warm-up' },
          { time: '9:00 AM', activity: 'First Round Matches' },
          { time: '12:30 PM', activity: 'Quarterfinals & Lunch Break' },
          { time: '3:00 PM', activity: 'Semifinals' },
          { time: '5:30 PM', activity: 'Grand Finale & Presentation' }
        ],
        participants: [
          { name: 'Vikram Seth', role: 'Participant' },
          { name: 'Aditi Rao', role: 'Participant' },
          { name: 'Rohan Mehta', role: 'Participant' },
          { name: 'Karan Johar', role: 'Participant' }
        ],
        organizedBy: 'Strydclub Mumbai',
        contact: '+91 98765 54321'
      },
      {
        slug: 'friday-night-football-league',
        title: 'Friday Night Football League',
        category: 'Football',
        description: 'Experience the thrill of playing under the lights. Form your squad or join a pool to play in a fast-paced 5-a-side night football format.',
        date: 'May 25, 2026',
        time: '7:00 PM',
        location: 'Green Field Arena, Delhi',
        status: 'upcoming',
        price: 600,
        slotsFilled: 8,
        slotsTotal: 22,
        rules: [
          { text: 'Teams must consist of 5 active players and up to 3 subs' },
          { text: 'Matches are 20 minutes halves with a 5-minute break' },
          { text: 'Sliding tackles and aggressive physical play are forbidden' },
          { text: 'Shin guards and proper turf studs are required' },
          { text: 'Rolling substitutions allowed with referee consent' }
        ],
        schedule: [
          { time: '6:30 PM', activity: 'Squad Check-in & Jersey Distribution' },
          { time: '7:00 PM', activity: 'Group Stage Kick-off' },
          { time: '8:30 PM', activity: 'Knockout Stage Starts' },
          { time: '9:45 PM', activity: 'Championship Final' },
          { time: '10:15 PM', activity: 'Post-match Social & Snacks' }
        ],
        participants: [
          { name: 'Kabir Singh', role: 'Participant' },
          { name: 'Aryan Khan', role: 'Participant' },
          { name: 'Deepak Gupta', role: 'Participant' },
          { name: 'Manish Pandey', role: 'Participant' }
        ],
        organizedBy: 'Strydclub Delhi',
        contact: '+91 98765 65432'
      },
      {
        slug: 'sunrise-volleyball-championship',
        title: 'Sunrise Volleyball Championship',
        category: 'Volleyball',
        description: 'Kickstart your weekend with an action-packed beach volleyball tournament. Smash, block, and dive in a competitive 4v4 sand court setup.',
        date: 'May 30, 2026',
        time: '5:30 AM',
        location: 'Beach Courts, Goa',
        status: 'upcoming',
        price: 299,
        slotsFilled: 10,
        slotsTotal: 30,
        rules: [
          { text: 'Teams must have 4 players on the sand at all times' },
          { text: 'Standard beach volleyball side-out scoring applies' },
          { text: 'Max of 3 touches per side; blocks do not count as a touch' },
          { text: 'A sportsmanlike attitude is required; no net touches' },
          { text: 'Appropriate beach sports apparel must be worn' }
        ],
        schedule: [
          { time: '5:00 AM', activity: 'Sunrise Athlete Meet & Greet' },
          { time: '5:30 AM', activity: 'Qualifying Rounds' },
          { time: '7:30 AM', activity: 'Breakfast & Hydration Break' },
          { time: '8:30 AM', activity: 'Semifinals & Finals' },
          { time: '10:00 AM', activity: 'Trophy Awards Ceremony' }
        ],
        participants: [
          { name: 'Sameer Sen', role: 'Participant' },
          { name: 'Nisha Patel', role: 'Participant' },
          { name: 'Varun Dhawan', role: 'Participant' },
          { name: 'Alia Bhatt', role: 'Participant' }
        ],
        organizedBy: 'Strydclub Goa',
        contact: '+91 98765 76543'
      },
      {
        slug: 'pickleball-pro-league',
        title: 'Pickleball Pro League',
        category: 'Pickleball',
        description: 'Join the fastest-growing racquet sport revolution. Compete in a doubles pickleball ladder tournament designed for intermediate to advanced enthusiasts.',
        date: 'June 5, 2026',
        time: '10:00 AM',
        location: 'Indoor Arena, Pune',
        status: 'upcoming',
        price: 400,
        slotsFilled: 15,
        slotsTotal: 40,
        rules: [
          { text: 'Matches are played as standard doubles (bring a partner or get matched)' },
          { text: 'First to 11 points (must win by 2 points)' },
          { text: 'Underhand serve with contact below the waist only' },
          { text: 'No volleying within the non-volley zone (the kitchen)' },
          { text: 'Official tournament balls will be provided' }
        ],
        schedule: [
          { time: '9:30 AM', activity: 'Court Assignment & Practice Rallies' },
          { time: '10:00 AM', activity: 'Round Robin Placement Matches' },
          { time: '12:30 PM', activity: 'Double Elimination Bracket Launch' },
          { time: '3:00 PM', activity: 'Pro Division Finals' },
          { time: '4:00 PM', activity: 'Closing Ceremony & Networking' }
        ],
        participants: [
          { name: 'Riya Sen', role: 'Participant' },
          { name: 'Abhishek Roy', role: 'Participant' },
          { name: 'Pooja Hegde', role: 'Participant' },
          { name: 'Kunal Kapoor', role: 'Participant' }
        ],
        organizedBy: 'Strydclub Pune',
        contact: '+91 98765 87654'
      },
      {
        slug: 'traditional-kho-kho-challenge',
        title: 'Traditional Kho Kho Challenge',
        category: 'Kho Kho',
        description: 'Reconnect with your roots in this exciting, high-speed traditional chase tag format. Sprint, dodge, dive, and chase your way to victory.',
        date: 'June 8, 2026',
        time: '4:00 PM',
        location: 'Stadium, Hyderabad',
        status: 'upcoming',
        price: 199,
        slotsFilled: 6,
        slotsTotal: 20,
        rules: [
          { text: 'Standard KKFI ground dimensions and rules apply' },
          { text: 'Teams consist of 12 players (9 active, 3 substitutes)' },
          { text: 'Chasing team must sit on the squares in alternate directions' },
          { text: 'Chaser can only change direction by tapping a teammate\'s back (\'Kho\')' },
          { text: 'Defenders must dodge the chaser without stepping outside bounds' }
        ],
        schedule: [
          { time: '3:30 PM', activity: 'Team Briefing & Strategic Walkthrough' },
          { time: '4:00 PM', activity: 'Innings 1 (Match A vs Match B)' },
          { time: '5:15 PM', activity: 'Innings 2 (Championship Placement)' },
          { time: '6:30 PM', activity: 'Grand Finale Chase' },
          { time: '7:00 PM', activity: 'Traditional Sweets & Prize Distribution' }
        ],
        participants: [
          { name: 'Vivek Agnihotri', role: 'Participant' },
          { name: 'Anupam Kher', role: 'Participant' },
          { name: 'Pallavi Joshi', role: 'Participant' },
          { name: 'Mithun Chakraborty', role: 'Participant' }
        ],
        organizedBy: 'Strydclub Hyderabad',
        contact: '+91 98765 98765'
      },
      {
        slug: 'padel-club-challenge',
        title: 'Padel Club Challenge',
        category: 'Padel',
        description: 'Test your skills in this premium, glass-walled doubles padel sport. Rapid rallies, wall rebounds, and tactical play make this an unforgettable experience.',
        date: 'June 25, 2026',
        time: '6:00 PM',
        location: 'Padel Arena, Hyderabad',
        status: 'upcoming',
        price: 550,
        slotsFilled: 10,
        slotsTotal: 20,
        rules: [
          { text: 'Matches are doubles format only; scoring is same as tennis' },
          { text: 'Serves must be underhand and struck at or below waist level' },
          { text: 'The ball must bounce on the ground before hitting any glass or mesh walls' },
          { text: 'Padel rackets must have safety cords securely around the wrist' },
          { text: 'Padel-specific non-slip shoes are highly recommended' }
        ],
        schedule: [
          { time: '5:30 PM', activity: 'Racket Check & Court Warm-up' },
          { time: '6:00 PM', activity: 'Round Robin matches' },
          { time: '7:30 PM', activity: 'Quarterfinals & Semifinals' },
          { time: '9:00 PM', activity: 'Championship Final Match' },
          { time: '9:45 PM', activity: 'Beverages & Award Ceremony' }
        ],
        participants: [
          { name: 'Nagarjuna Rao', role: 'Participant' },
          { name: 'Chaitanya Akkineni', role: 'Participant' },
          { name: 'Samantha Ruth', role: 'Participant' },
          { name: 'Rashmika Mandanna', role: 'Participant' }
        ],
        organizedBy: 'Strydclub Padel',
        contact: '+91 98765 12345'
      }
    ]);

    console.log('Seeded Events successfully...');

    const marathon = events.find(e => e.slug === 'weekend-5k-marathon');
    const football = events.find(e => e.slug === 'friday-night-football-league');
    const badminton = events.find(e => e.slug === 'inter-city-badminton-tournament');

    await Registration.create([
      {
        user: defaultUser._id,
        event: marathon._id,
        status: 'Confirmed'
      },
      {
        user: defaultUser._id,
        event: football._id,
        status: 'Confirmed'
      }
    ]);

    await Registration.create([
      {
        user: defaultUser._id,
        event: badminton._id,
        status: 'Completed',
        result: '2nd Place',
        won: true
      },
      {
        user: defaultUser._id,
        event: football._id,
        status: 'Completed',
        result: 'Participant',
        won: false
      }
    ]);

    console.log('Seeded registrations successfully!');
    process.exit(0);
  } catch (error) {
    console.error(`Error seeding database: ${error.message}`);
    process.exit(1);
  }
};

seedData();
