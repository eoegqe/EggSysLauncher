package com.theegget.eggsys;

import android.app.Activity;
import android.os.CancellationSignal;

import androidx.credentials.CreatePublicKeyCredentialRequest;
import androidx.credentials.CreateCredentialResponse;
import androidx.credentials.CredentialManager;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.GetPublicKeyCredentialOption;
import androidx.credentials.GetPublicKeyCredentialOption;
import androidx.credentials.exceptions.CreateCredentialException;
import androidx.credentials.exceptions.GetCredentialException;

import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

/** Native Android passkey bridge for EggSys WebView authentication. */
public final class PasskeyBridge {
    private final Activity activity;
    private final CredentialManager credentialManager;
    private final Executor executor = Executors.newSingleThreadExecutor();

    public PasskeyBridge(Activity activity) {
        this.activity = activity;
        this.credentialManager = CredentialManager.create(activity);
    }

    public void getPasskey(String requestJson, ResultCallback callback) {
        GetPublicKeyCredentialOption option = new GetPublicKeyCredentialOption(requestJson);
        GetCredentialRequest request = new GetCredentialRequest.Builder()
                .addCredentialOption(option)
                .build();
        credentialManager.getCredentialAsync(activity, request, new CancellationSignal(), executor,
                new androidx.credentials.CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                    @Override public void onResult(GetCredentialResponse result) {
                        if (result.getCredential() instanceof androidx.credentials.PublicKeyCredential) {
                            callback.success(((androidx.credentials.PublicKeyCredential) result.getCredential()).getAuthenticationResponseJson());
                        } else {
                            callback.error("Android did not return a passkey credential.");
                        }
                    }
                    @Override public void onError(GetCredentialException e) {
                        callback.error(e.getMessage() == null ? "Passkey authentication failed." : e.getMessage());
                    }
                });
    }

    public interface ResultCallback {
        void success(String responseJson);
        void error(String message);
    }
}
