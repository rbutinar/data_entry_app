from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from ..database.connection import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String)
    
    # Relationship to user_table_access
    table_access = relationship("UserTableAccess", back_populates="user")

class Table(Base):
    __tablename__ = "tables"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    description = Column(Text)
    
    # Relationship to user_table_access
    user_access = relationship("UserTableAccess", back_populates="table")

class UserTableAccess(Base):
    __tablename__ = "user_table_access"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    table_id = Column(Integer, ForeignKey("tables.id"))
    
    # Relationships
    user = relationship("User", back_populates="table_access")
    table = relationship("Table", back_populates="user_access")
