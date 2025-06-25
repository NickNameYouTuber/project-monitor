import React from 'react';
import { useAppContext } from '../../utils/AppContext';

interface TeamMembersProps {
  onAddMember: () => void;
}

const TeamMembers: React.FC<TeamMembersProps> = ({ onAddMember }) => {
  const { teamMembers, removeTeamMember } = useAppContext();

  return (
    <div className="bg-bg-card rounded-lg shadow-md p-6 mb-8">
      <h2 className="text-xl font-semibold text-text-primary mb-4">Team Members</h2>
      <div className="flex flex-wrap gap-2">
        {teamMembers.map((member) => (
          <span 
            key={member} 
            className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm flex items-center"
          >
            {member}
            {member !== 'You' && (
              <button 
                onClick={() => {
                  if(confirm('Are you sure you want to remove this team member?')) {
                    removeTeamMember(member);
                  }
                }} 
                className="ml-2 w-5 h-5 rounded-full flex items-center justify-center bg-primary/20 text-primary hover:bg-primary/30"
              >
                <i className="fas fa-times text-xs"></i>
              </button>
            )}
          </span>
        ))}
        <button 
          onClick={onAddMember}
          className="bg-bg-secondary hover:bg-bg-hover text-text-secondary px-3 py-1 rounded-full text-sm transition"
        >
          <i className="fas fa-plus mr-1"></i>Add Member
        </button>
      </div>
    </div>
  );
};

export default TeamMembers;
