import { useTheme } from '../../context/ThemeContext';

export default function SettingsHeader() {
    const { userData, colors } = useTheme();
    const initial = userData?.fullName?.charAt(0).toUpperCase() || 'U';

    return (
        <View style={styles.container}>
            <View style={styles.profileRow}>
                <View style={[styles.avatarContainer, { backgroundColor: colors.accentCyan }]}>
                    <Text style={styles.avatarText}>{initial}</Text>
                    <View style={styles.editBadge}>
                        <Text style={styles.editIcon}>✎</Text>
                    </View>
                </View>
                <View style={styles.info}>
                    <Text style={[styles.name, { color: colors.textPrimary }]}>{userData?.fullName}</Text>
                    <View style={[styles.badge, { backgroundColor: colors.accentCyan + '20' }]}>
                        <Text style={[styles.badgeText, { color: colors.accentCyan }]}>{userData?.status || 'PRO MEMBER'}</Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.md,
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    avatarContainer: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: ColorsLight.accentCyan,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        shadowColor: ColorsLight.accentCyan,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    avatarText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFF',
    },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: ColorsLight.bgCardBorder,
    },
    editIcon: { fontSize: 12 },
    info: { justifyContent: 'center' },
    name: {
        fontSize: 24,
        fontWeight: '700',
        color: ColorsLight.textPrimary,
        marginBottom: 4,
    },
    badge: {
        backgroundColor: ColorsLight.accentCyan + '20',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: Radius.pill,
        alignSelf: 'flex-start',
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: ColorsLight.accentCyan,
        letterSpacing: 0.5,
    },
});
