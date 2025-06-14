import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { TimeEntry, ProductivityReport } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const period = searchParams.get('period') || 'weekly';
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

    // Calculate date range based on period
    let queryStartDate: Date;
    let queryEndDate: Date = new Date();

    if (startDate && endDate) {
      queryStartDate = new Date(startDate);
      queryEndDate = new Date(endDate);
    } else {
      switch (period) {
        case 'daily':
          queryStartDate = new Date();
          queryStartDate.setHours(0, 0, 0, 0);
          break;
        case 'weekly':
          queryStartDate = new Date();
          queryStartDate.setDate(queryStartDate.getDate() - 7);
          break;
        case 'monthly':
          queryStartDate = new Date();
          queryStartDate.setMonth(queryStartDate.getMonth() - 1);
          break;
        default:
          queryStartDate = new Date();
          queryStartDate.setDate(queryStartDate.getDate() - 7);
      }
    }

    const pipeline = [
      {
        $match: {
          userId,
          timestamp: {
            $gte: queryStartDate,
            $lte: queryEndDate
          }
        }
      },
      {
        $group: {
          _id: {
            domain: '$domain',
            category: '$category'
          },
          totalTime: { $sum: '$timeSpent' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { totalTime: -1 }
      }
    ];

    const aggregatedData = await timeEntriesCollection.aggregate(pipeline).toArray();

    let totalTime = 0;
    let productiveTime = 0;
    let unproductiveTime = 0;
    let neutralTime = 0;

    const topSites = aggregatedData.map(item => {
      const timeSpent = item.totalTime;
      totalTime += timeSpent;

      switch (item._id.category) {
        case 'productive':
          productiveTime += timeSpent;
          break;
        case 'unproductive':
          unproductiveTime += timeSpent;
          break;
        case 'neutral':
          neutralTime += timeSpent;
          break;
      }

      return {
        domain: item._id.domain,
        timeSpent,
        category: item._id.category
      };
    });

    const dailyPipeline = [
      {
        $match: {
          userId,
          timestamp: {
            $gte: queryStartDate,
            $lte: queryEndDate
          }
        }
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$timestamp'
              }
            },
            category: '$category'
          },
          timeSpent: { $sum: '$timeSpent' }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          totalTime: { $sum: '$timeSpent' },
          categories: {
            $push: {
              category: '$_id.category',
              time: '$timeSpent'
            }
          }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ];

    const dailyData = await timeEntriesCollection.aggregate(dailyPipeline).toArray();

    const dailyBreakdown = dailyData.map(day => {
      const productiveTime = day.categories.find((cat: any) => cat.category === 'productive')?.time || 0;
      return {
        date: new Date(day._id),
        totalTime: day.totalTime,
        productiveTime
      };
    });

    const report: ProductivityReport = {
      userId,
      period: period as 'daily' | 'weekly' | 'monthly',
      startDate: queryStartDate,
      endDate: queryEndDate,
      totalTime,
      productiveTime,
      unproductiveTime,
      neutralTime,
      topSites: topSites.slice(0, 10),
      dailyBreakdown
    };

    return NextResponse.json({ report }, { status: 200 });

  } catch (error) {
    console.error('Error generating analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}