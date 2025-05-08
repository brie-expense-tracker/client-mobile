import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Image } from 'react-native';

const Profile = () => {
	const [name, setName] = useState('John Doe');
	const [email, setEmail] = useState('john.doe@example.com');
	const [editing, setEditing] = useState(false);

	const handleEditToggle = () => {
		setEditing(!editing);
	};

	const handleSave = () => {
		// Save the updated profile information
		setEditing(false);
	};

	return (
		<View style={styles.container}>
			<Image
				source={{ uri: 'https://via.placeholder.com/100' }}
				style={styles.profileImage}
			/>
			{editing ? (
				<>
					<TextInput style={styles.input} value={name} onChangeText={setName} />
					<TextInput
						style={styles.input}
						value={email}
						onChangeText={setEmail}
					/>
					<Button title="Save" onPress={handleSave} />
				</>
			) : (
				<>
					<Text style={styles.text}>Name: {name}</Text>
					<Text style={styles.text}>Email: {email}</Text>
					<Button title="Edit Profile" onPress={handleEditToggle} />
				</>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 20,
	},
	profileImage: {
		width: 100,
		height: 100,
		borderRadius: 50,
		marginBottom: 20,
	},
	input: {
		borderWidth: 1,
		borderColor: 'gray',
		padding: 10,
		marginBottom: 10,
		width: '80%',
	},
	text: {
		fontSize: 18,
		marginBottom: 10,
	},
});

export default Profile;
