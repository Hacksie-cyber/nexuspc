import { Clock } from 'lucide-react';

interface SiteTabProps {
  activeTab: 'settings';
  setActiveTab: (tab: string) => void;
}

export function SiteTab({ activeTab, setActiveTab }: SiteTabProps) {
  return (
    <>
            {activeTab === 'settings' && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-4">
                  <Clock size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Section Under Construction</h3>
                <p className="text-gray-400 max-w-xs">We're currently building out the full functionality for the settings section.</p>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="mt-6 text-green-600 font-bold hover:underline"
                >
                  Back to Dashboard
                </button>
              </div>
            )}
    </>
  );
}
