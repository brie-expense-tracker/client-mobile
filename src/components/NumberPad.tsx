import React, {
	Dispatch,
	SetStateAction,
	useEffect,
	useRef,
	useState,
} from 'react';
import {
	View,
	TouchableOpacity,
	Text,
	StyleSheet,
	TextInput,
} from 'react-native';

interface NumberPadProps {
	onValueChange: Dispatch<SetStateAction<string>>;
}

const NumberPad: React.FC<NumberPadProps> = ({ onValueChange }) => {
	const inputRef = useRef<TextInput>(null);
	const [value, setValue] = useState('');

	useEffect(() => {
		if (inputRef.current) {
			inputRef.current.focus();
			inputRef.current.setNativeProps({
				selection: { start: 0, end: value.length },
			});
		}
	}, [value]);

	const handlePress = (num: string) => {
		setValue((prev) => {
			const newValue = (prev + num).slice(-6); // Limit to 6 characters, FIFO
			onValueChange(newValue);
			return newValue;
		});
	};

	const handleBackspace = () => {
		setValue((prev) => {
			const newValue = prev.slice(0, -1);
			onValueChange(newValue);
			return newValue;
		});
	};

	return (
		<View style={styles.padContainer}>
			<View style={styles.row}>
				{[1, 2, 3].map((num) => (
					<TouchableOpacity
						key={num}
						style={styles.button}
						onPress={() => handlePress(num.toString())}
					>
						<Text style={styles.buttonText}>{num}</Text>
					</TouchableOpacity>
				))}
			</View>
			<View style={styles.row}>
				{[4, 5, 6].map((num) => (
					<TouchableOpacity
						key={num}
						style={styles.button}
						onPress={() => handlePress(num.toString())}
					>
						<Text style={styles.buttonText}>{num}</Text>
					</TouchableOpacity>
				))}
			</View>
			<View style={styles.row}>
				{[7, 8, 9].map((num) => (
					<TouchableOpacity
						key={num}
						style={styles.button}
						onPress={() => handlePress(num.toString())}
					>
						<Text style={styles.buttonText}>{num}</Text>
					</TouchableOpacity>
				))}
			</View>
			<View style={styles.row}>
				<TouchableOpacity
					style={styles.button}
					onPress={() => handlePress('.')}
				>
					<Text style={styles.buttonText}>.</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={styles.button}
					onPress={() => handlePress('0')}
				>
					<Text style={styles.buttonText}>0</Text>
				</TouchableOpacity>
				<TouchableOpacity style={styles.button} onPress={handleBackspace}>
					<Text style={styles.buttonText}>⌫</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
};

export default NumberPad;

const styles = StyleSheet.create({
	padContainer: {
		justifyContent: 'center',
		marginTop: 20,
	},
	button: {
		flex: 1,
		height: 60,
		justifyContent: 'center',
		alignItems: 'center',
		margin: 5,
		backgroundColor: '#ddd',
		borderRadius: 30,
	},
	buttonText: {
		fontSize: 24,
		color: '#333',
	},
	row: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
});
