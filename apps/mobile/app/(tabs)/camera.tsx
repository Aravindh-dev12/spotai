import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { ActivityIndicator, Image, Pressable, SafeAreaView, ScrollView, Text, View } from 'react-native';
import { completeMedia, createReveal, createUploadIntent, uploadFile } from '../../lib/api';

export default function CameraScreen() {
  const [uri, setUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function choose() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setStatus('Photo access is required only when you choose a photo.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9, allowsEditing: false });
    if (!result.canceled) setUri(result.assets[0]?.uri ?? null);
  }

  async function activate() {
    if (!uri || loading) return;
    setLoading(true); setStatus('Preparing your chosen image…');
    try {
      const intent = await createUploadIntent('image/jpeg', 'form_reveal');
      const size = await uploadFile(intent.uploadUrl, uri, 'image/jpeg');
      await completeMedia(intent.media.id, size);
      const reveal = await createReveal(intent.media.id);
      setStatus(`Reveal ${reveal.status}. Your original photo remains the source; the renderer never changes identity state.`);
    } catch (cause) {
      setStatus(cause instanceof Error ? cause.message : 'Could not start reveal');
    } finally { setLoading(false); }
  }

  return <SafeAreaView style={{ flex: 1 }}>
    <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
      <Text style={{ marginTop: 28, letterSpacing: 2 }}>ACTIVATE FORM</Text>
      <Text style={{ fontSize: 36, fontWeight: '800' }}>Turn a real moment into a Form reveal.</Text>
      <Text style={{ opacity: 0.62, fontSize: 17 }}>Nothing is scanned in the background. You explicitly choose the image that can be used.</Text>
      {uri ? <Image source={{ uri }} style={{ width: '100%', aspectRatio: 4/5, borderRadius: 18 }} /> : <View style={{ height: 360, borderWidth: 1, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}><Text>No image selected</Text></View>}
      <Pressable onPress={choose} style={{ padding: 17, borderWidth: 1, borderRadius: 15 }}><Text style={{ textAlign: 'center' }}>{uri ? 'Choose another photo' : 'Choose a photo'}</Text></Pressable>
      <Pressable onPress={activate} disabled={!uri || loading} style={{ padding: 18, borderWidth: 1, borderRadius: 15, opacity: uri ? 1 : 0.35 }}>
        {loading ? <ActivityIndicator /> : <Text style={{ textAlign: 'center', fontSize: 18 }}>Activate my Form</Text>}
      </Pressable>
      {status ? <Text>{status}</Text> : null}
    </ScrollView>
  </SafeAreaView>;
}
