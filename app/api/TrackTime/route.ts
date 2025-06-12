import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { TimeEntry, WebsiteCategory } from '@/types';

// Default website categories
const defaultCategories: Record<string, 'productive' | 'unproductive' | 'neutral'> = {
  // Productive sites
  'github.com': 'productive',
  'stackoverflow.com': 'productive',
  'developer.mozilla.org': 'productive',
  'docs.google.com': 'productive',
  'notion.so': 'productive',
  'codepen.io': 'productive',
  'w3schools.com': 'productive',
  'leetcode.com': 'productive',
  'coursera.org': 'productive',
  'udemy.com': 'productive',
  'linkedin.com':'productive',
  'chatgpt.com':'productive',
  
  // Unproductive sites
  'facebook.com': 'unproductive',
  'twitter.com': 'unproductive',
  'instagram.com': 'unproductive',
  'tiktok.com': 'unproductive',
  'youtube.com': 'unproductive',
  'netflix.com': 'unproductive',
  'reddit.com': 'unproductive',
  'twitch.tv': 'unproductive',
  'jiohotstar.com': 'unproductive'
};

function getDomainFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url;
  }
}

function categorizeWebsite(domain: string): 'productive' | 'unproductive' | 'neutral' {
    console.log(defaultCategories[domain]);
    return defaultCategories[domain] || 'neutral';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, url, title, timeSpent, sessionId } = body;

    if (!userId || !url || !timeSpent || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const domain = getDomainFromUrl(url);
    const category = categorizeWebsite(domain);

    const db = await getDatabase();
    const timeEntriesCollection = db.collection<TimeEntry>('timeEntries');

    const timeEntry: TimeEntry = {
      userId,
      url,
      domain,
      title: title || '',
      timeSpent: parseInt(timeSpent),
      category,
      timestamp: new Date(),
      sessionId
    };

    await timeEntriesCollection.insertOne(timeEntry);

    return NextResponse.json({
      message: 'Time entry recorded successfully',
      category
    }, { status: 201 });

  } catch (error) {
    console.error('Error recording time entry:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId parameter is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const timeEntriesCollection = db.collection<TimeEntry>('timeEntries');

    let query: any = { userId };

    if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const timeEntries = await timeEntriesCollection
      .find(query)
      .sort({ timestamp: -1 })
      .limit(1000)
      .toArray();

    return NextResponse.json({ timeEntries }, { status: 200 });

  } catch (error) {
    console.error('Error fetching time entries:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}