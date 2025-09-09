// useUser.ts - Centralized user fetching with React Query
import { useQuery } from '@tanstack/react-query';
import { UserService } from '../services/core/userService';
import useAuth from '../context/AuthContext';

export function useUser() {
	const { firebaseUser } = useAuth();

	return useQuery({
		queryKey: ['user', firebaseUser?.uid],
		queryFn: async () => {
			if (!firebaseUser?.uid) {
				throw new Error('No Firebase user');
			}
			return UserService.getUserByFirebaseUID(firebaseUser.uid);
		},
		enabled: !!firebaseUser?.uid,
		staleTime: 5 * 60 * 1000, // 5 minutes
		refetchOnWindowFocus: false,
		refetchOnMount: false,
		retry: (failureCount, error: any) => {
			// Don't retry on 429 rate limit errors
			if (error?.response?.status === 429 || error?.status === 429) {
				return false;
			}
			// Don't retry on 4xx errors
			if (error && error.status >= 400 && error.status < 500) {
				return false;
			}
			// Retry up to 2 times for other errors
			return failureCount < 2;
		},
	});
}

export function useUserProfile() {
	const { user } = useAuth();

	return useQuery({
		queryKey: ['userProfile', user?._id],
		queryFn: async () => {
			if (!user?._id) {
				throw new Error('No user ID');
			}
			return UserService.getProfileByUserId(user._id);
		},
		enabled: !!user?._id,
		staleTime: 5 * 60 * 1000, // 5 minutes
		refetchOnWindowFocus: false,
		refetchOnMount: false,
		retry: (failureCount, error: any) => {
			// Don't retry on 429 rate limit errors
			if (error?.response?.status === 429 || error?.status === 429) {
				return false;
			}
			// Don't retry on 4xx errors
			if (error && error.status >= 400 && error.status < 500) {
				return false;
			}
			// Retry up to 2 times for other errors
			return failureCount < 2;
		},
	});
}
