import React from 'react';
import { useAppContext } from '../../utils/AppContext';

interface TeamMembersProps {
  onAddMember: () => void;
}

const TeamMembers: React.FC<TeamMembersProps> = ({ onAddMember }) => {
  const { teamMembers, removeTeamMember } = useAppContext();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">Team Members</h2>
      <div className="flex flex-wrap gap-2">
        {teamMembers.map((member) => (
          <span 
            key={member} 
            className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm flex items-center"
          >
            {member}
            {member !== 'You' && (
              <button 
                onClick={() => {
                  if(confirm('Are you sure you want to remove this team member?')) {
                    removeTeamMember(member);
                  }
                }} 
                className="ml-2 w-5 h-5 rounded-full flex items-center justify-center bg-blue-200 dark:bg-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-300 dark:hover:bg-blue-700"
              >
                <i className="fas fa-times text-xs"></i>
              </button>
            )}
          </span>
        ))}
        <button 
          onClick={onAddMember}
          className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 px-3 py-1 rounded-full text-sm transition"
        >
          <i className="fas fa-plus mr-1"></i>Add Member
        </button>
      </div>
    </div>
  );
};

export default TeamMembers;
