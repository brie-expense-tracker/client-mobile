import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Google Sign-In configuration
export const configureGoogleSignIn = () => {
	try {
		console.log('🔧 Configuring Google Sign-In...');
		GoogleSignin.configure({
			webClientId:
				'807336746313-5spjml5hicchm614hbvk67csns8idd66.apps.googleusercontent.com', // Web client ID from Firebase Console
			offlineAccess: true, // if you want to access Google API on behalf of the user FROM YOUR SERVER
			hostedDomain: '', // specifies a hosted domain restriction
			forceCodeForRefreshToken: true, // [Android] related to `serverAuthCode`, read the docs link below *.
			accountName: '', // [Android] specifies an account name on the device that should be used
			iosClientId:
				'807336746313-khft9ts8r9li4cvme5bpjnhr1tdou3je.apps.googleusercontent.com', // [iOS] if you want to specify the client ID of type iOS (otherwise, it is taken from GoogleService-Info.plist)
			googleServicePlistPath: '', // [iOS] if you renamed your GoogleService-Info.plist file, add the new name here
			profileImageSize: 120, // [iOS] The desired height (and width) of the profile image. Defaults to 120px
			scopes: [
				'https://www.googleapis.com/auth/userinfo.email',
				'https://www.googleapis.com/auth/userinfo.profile',
			], // Add required scopes
		});
		console.log('✅ Google Sign-In configured successfully');
	} catch (error) {
		console.error('❌ Failed to configure Google Sign-In:', error);
		throw error;
	}
};

export default configureGoogleSignIn;
