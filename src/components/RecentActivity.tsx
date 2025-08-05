import React from 'react';
import { CheckCircle, XCircle, Clock, Star } from 'lucide-react';

interface Activity {
  id: string;
  type: 'completed' | 'cancelled' | 'pending' | 'rated';
  candidateName: string;
  position: string;
  timestamp: string;
  details?: string;
}

const activities: Activity[] = [
  {
    id: '1',
    type: 'completed',
    candidateName: 'Alex Thompson',
    position: 'React Developer',
    timestamp: '2 hours ago',
    details: 'Technical interview completed successfully'
  },
  {
    id: '2',
    type: 'rated',
    candidateName: 'Lisa Park',
    position: 'UX Designer',
    timestamp: '4 hours ago',
    details: 'Received 4.8/5 rating'
  },
  {
    id: '3',
    type: 'cancelled',
    candidateName: 'John Smith',
    position: 'Backend Engineer',
    timestamp: '6 hours ago',
    details: 'Interview rescheduled by candidate'
  },
  {
    id: '4',
    type: 'pending',
    candidateName: 'Maria Garcia',
    position: 'Product Manager',
    timestamp: '1 day ago',
    details: 'Waiting for feedback submission'
  }
];

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'completed':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'cancelled':
      return <XCircle className="w-5 h-5 text-red-500" />;
    case 'pending':
      return <Clock className="w-5 h-5 text-yellow-500" />;
    case 'rated':
      return <Star className="w-5 h-5 text-purple-500" />;
    default:
      return <Clock className="w-5 h-5 text-gray-500" />;
  }
};

const getActivityColor = (type: string) => {
  switch (type) {
    case 'completed':
      return 'border-green-200 bg-green-50';
    case 'cancelled':
      return 'border-red-200 bg-red-50';
    case 'pending':
      return 'border-yellow-200 bg-yellow-50';
    case 'rated':
      return 'border-purple-200 bg-purple-50';
    default:
      return 'border-gray-200 bg-gray-50';
  }
};

export const RecentActivity: React.FC = () => {
  return (
    <div className="glass rounded-xl p-6 animate-fade-up" style={{ animationDelay: '0.6s' }}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-foreground">Recent Activity</h2>
        <span className="text-sm text-muted-foreground">Last 24 hours</span>
      </div>
      
      <div className="space-y-4">
        {activities.map((activity, index) => (
          <div 
            key={activity.id}
            className={`flex items-start space-x-4 p-4 rounded-lg border transition-all duration-300 hover-lift ${getActivityColor(activity.type)} animate-slide-right`}
            style={{ animationDelay: `${0.7 + index * 0.1}s` }}
          >
            <div className="flex-shrink-0 mt-1">
              {getActivityIcon(activity.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground truncate">
                  {activity.candidateName}
                </h3>
                <span className="text-xs text-muted-foreground">{activity.timestamp}</span>
              </div>
              <p className="text-sm text-muted-foreground">{activity.position}</p>
              {activity.details && (
                <p className="text-xs text-muted-foreground mt-1">{activity.details}</p>
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 pt-4 border-t border-border">
        <button className="w-full py-3 rounded-lg border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-500 hover-lift hover-scale">
          View All My Activity
        </button>
      </div>
    </div>
  );
};