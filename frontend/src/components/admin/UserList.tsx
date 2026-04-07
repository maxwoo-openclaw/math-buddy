import type { User } from '../../types';

interface UserListProps {
  users: User[];
  onDelete: (id: number) => void;
}

export default function UserList({ users, onDelete }: UserListProps) {
  if (users.length === 0) {
    return <p className="empty-message">No users found.</p>;
  }

  return (
    <div className="user-table-wrapper">
      <table className="user-table">
        <thead>
          <tr>
            <th>Username</th>
            <th>Email</th>
            <th>Role</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td className="username-cell">
                <span className="user-avatar">
                  {user.role === 'admin' ? '👩‍🏫' : '👧'}
                </span>
                {user.username}
              </td>
              <td>{user.email}</td>
              <td>
                <span className={`role-badge role-${user.role}`}>
                  {user.role === 'admin' ? 'Teacher' : 'Student'}
                </span>
              </td>
              <td>{new Date(user.created_at).toLocaleDateString()}</td>
              <td>
                <button
                  className="btn btn-danger-sm"
                  onClick={() => onDelete(user.id)}
                  disabled={user.id === 1} // Prevent deleting first admin
                >
                  🗑️
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
