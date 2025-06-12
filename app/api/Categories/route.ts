import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { WebsiteCategory } from '@/types';

export async function GET() {
  try {
    const db = await getDatabase();
    const categoriesCollection = db.collection<WebsiteCategory>('websiteCategories');

    const categories = await categoriesCollection.find({}).toArray();

    return NextResponse.json({ categories }, { status: 200 });

  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domain, category } = body;

    if (!domain || !category) {
      return NextResponse.json(
        { error: 'Domain and category are required' },
        { status: 400 }
      );
    }

    if (!['productive', 'unproductive', 'neutral'].includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category. Must be productive, unproductive, or neutral' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const categoriesCollection = db.collection<WebsiteCategory>('websiteCategories');

    // Update or insert category
    await categoriesCollection.updateOne(
      { domain },
      {
        $set: {
          domain,
          category,
          isDefault: false
        }
      },
      { upsert: true }
    );

    return NextResponse.json({
      message: 'Category updated successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain parameter is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const categoriesCollection = db.collection<WebsiteCategory>('websiteCategories');

    await categoriesCollection.deleteOne({ domain, isDefault: false });

    return NextResponse.json({
      message: 'Category deleted successfully'
    }, { status: 200 });

  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}