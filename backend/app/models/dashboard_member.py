from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
import datetime
from ..database import Base


class DashboardMember(Base):
    __tablename__ = "dashboard_members"
    
    id = Column(String, primary_key=True)
    dashboard_id = Column(String, ForeignKey("dashboards.id", ondelete="CASCADE"))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"))
    role = Column(String, default="viewer")  # viewer, editor, admin
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    dashboard = relationship("Dashboard")
    user = relationship("User")
