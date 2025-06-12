import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { User } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, password } = body;

    if (!email || !name || !password) {
      return NextResponse.json(
        { error: 'all fields are required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const usersCollection = db.collection<User>('users');

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Create new user
    const newUser: User = {
      email,
      name,
      password,
      createdAt: new Date(),
      settings: {
        productiveCategories: ['github.com', 'stackoverflow.com', 'developer.mozilla.org','chatgpt.com', 'linkedin.com'],
        unproductiveCategories: ['facebook.com', 'twitter.com', 'instagram.com', 'tiktok.com','youtube.com'],
        workingHours: {
          start: '07:00',
          end: '23:00'
        },
        notifications: true
      }
    };

    const result = await usersCollection.insertOne(newUser);
    
    return NextResponse.json({
      message: 'User created successfully',
      userId: result.insertedId
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const password = searchParams.get('password');

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      );
    }
    if (!password) {
      return NextResponse.json(
        { error: 'Password parameter is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const usersCollection = db.collection<User>('users');

    const user = await usersCollection.findOne({ email,password });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if(user) {
      if(password != user.password) {
        return NextResponse.json({
          error: 'Incorrect passsword'
        },{
          status: 404
        })
      }
      else {
        return NextResponse.json({ user }, { status: 200 });
      }
    }

  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}