package com.ppde.viewer;

import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.provider.OpenableColumns;
import android.util.Base64;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        handleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if (Intent.ACTION_VIEW.equals(action) || Intent.ACTION_SEND.equals(action)) {
            Uri uri = intent.getData();
            if (uri == null && intent.hasExtra(Intent.EXTRA_STREAM)) {
                uri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            }
            if (uri != null) {
                processFileUri(uri);
            }
        }
    }

    private void processFileUri(final Uri uri) {
        new Thread(() -> {
            try {
                String fileName = getFileName(uri);
                String mimeType = getContentResolver().getType(uri);
                if (mimeType == null || mimeType.equals("application/octet-stream")) {
                    String lowerName = fileName.toLowerCase();
                    if (lowerName.endsWith(".pdf")) mimeType = "application/pdf";
                    else if (lowerName.endsWith(".docx")) mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                    else if (lowerName.endsWith(".doc")) mimeType = "application/msword";
                    else if (lowerName.endsWith(".xlsx")) mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                    else if (lowerName.endsWith(".xls")) mimeType = "application/vnd.ms-excel";
                    else if (lowerName.endsWith(".pptx")) mimeType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
                    else if (lowerName.endsWith(".ppt")) mimeType = "application/vnd.ms-powerpoint";
                    else mimeType = "application/octet-stream";
                }

                InputStream inputStream = getContentResolver().openInputStream(uri);
                if (inputStream == null) return;

                ByteArrayOutputStream byteBuffer = new ByteArrayOutputStream();
                byte[] buffer = new byte[8192];
                int len;
                while ((len = inputStream.read(buffer)) != -1) {
                    byteBuffer.write(buffer, 0, len);
                }
                inputStream.close();

                byte[] bytes = byteBuffer.toByteArray();
                String base64Data = Base64.encodeToString(bytes, Base64.NO_WRAP);

                final String finalFileName = fileName;
                final String finalMimeType = mimeType;

                // Send to WebView via JavaScript
                runOnUiThread(() -> {
                    if (bridge != null && bridge.getWebView() != null) {
                        String js = String.format(
                            "if (window.handleAndroidOpenFile) { window.handleAndroidOpenFile('%s', '%s', '%s'); } else { window._pendingAndroidFile = { name: '%s', mime: '%s', base64: '%s' }; }",
                            escapeJs(finalFileName),
                            escapeJs(finalMimeType),
                            base64Data,
                            escapeJs(finalFileName),
                            escapeJs(finalMimeType),
                            base64Data
                        );
                        bridge.getWebView().evaluateJavascript(js, null);
                    }
                });
            } catch (Exception e) {
                Log.e("PPDE_MainActivity", "Error reading intent file URI", e);
            }
        }).start();
    }

    private String getFileName(Uri uri) {
        String result = null;
        if ("content".equals(uri.getScheme())) {
            try (Cursor cursor = getContentResolver().query(uri, null, null, null, null)) {
                if (cursor != null && cursor.moveToFirst()) {
                    int nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                    if (nameIndex >= 0) {
                        result = cursor.getString(nameIndex);
                    }
                }
            } catch (Exception ignored) {}
        }
        if (result == null) {
            result = uri.getPath();
            if (result != null) {
                int cut = result.lastIndexOf('/');
                if (cut != -1) {
                    result = result.substring(cut + 1);
                }
            }
        }
        return result != null ? result : "document";
    }

    private String escapeJs(String str) {
        if (str == null) return "";
        return str.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n").replace("\r", "");
    }
}
