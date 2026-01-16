# Google Cloud VM Deployment Guide

This guide will walk you through deploying the Face Recognition App to a Google Cloud Platform (GCP) Compute Engine VM instance.

## Prerequisites
- A Google Cloud Platform account.
- A project created in GCP.
- A GitHub account.

## Step 1: Prepare Your Repository

Before deploying, we need to get your code onto GitHub.

1.  **Initialize Git** (if not already done):
    ```bash
    git init
    ```

2.  **Check `.gitignore`**:
    Ensure your `.gitignore` file includes the following to prevent uploading sensitive or unnecessary files:
    ```
    venv/
    node_modules/
    .env
    __pycache__/
    uploads/
    ```

3.  **Commit Your Code**:
    ```bash
    git add .
    git commit -m "Initial commit for GCP deployment"
    ```

4.  **Push to GitHub**:
    *   Create a new repository on GitHub (e.g., `cameo-face-app`).
    *   Follow the instructions to push an existing repository:
    ```bash
    git remote add origin https://github.com/<YOUR_USERNAME>/cameo-face-app.git
    git branch -M main
    git push -u origin main
    ```

## Step 2: Create a VM Instance

1.  Go to **Compute Engine** > **VM instances**.
2.  Click **Create Instance**.
3.  **Name**: `cameo-server` (or any name).
4.  **Region**: Choose a region close to your users (e.g., `us-central1`).
5.  **Machine Configuration**:
    *   **Series**: E2
    *   **Machine type**: `e2-medium` (2 vCPU, 4GB memory) - Recommended for production.
        *   *Minimum for testing*: `e2-small` (2 vCPU, 2GB memory).
6.  **Boot Disk**:
    *   Click **Change**.
    *   **Operating System**: `Ubuntu`.
    *   **Version**: `Ubuntu 22.04 LTS`.
    *   **Boot disk type**: `SSD persistent disk` (Recommended for performance).
    *   **Size**: `20 GB` (or more if you expect many photos).
    *   Click **Select**.
7.  **Firewall**:
    *   Check **Allow HTTP traffic**.
    *   Check **Allow HTTPS traffic**.
8.  Click **Create**.

## Step 3: Configure Firewall Rules (Optional but Recommended)

By default, GCP allows HTTP (80) and HTTPS (443). If you want to access other ports or ensure access:

1.  Go to **VPC network** > **Firewall**.
2.  Ensure `default-allow-http` and `default-allow-https` are present.

## Step 4: Connect to the VM

1.  In the VM instances list, click **SSH** next to your new instance.
2.  A terminal window will open.

## Step 5: Install Docker & Docker Compose

Run the following commands in the SSH terminal:

```bash
# Update package list
sudo apt-get update

# Install prerequisites
sudo apt-get install -y ca-certificates curl gnupg

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add the repository to Apt sources
echo \
  "deb [arch=\"$(dpkg --print-architecture)\" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Verify Docker installation
sudo docker --version
```

## Step 6: Clone Code & Configure Environment

1.  **Clone on the VM**:
    ```bash
    git clone https://github.com/<YOUR_USERNAME>/cameo-face-app.git cameo
    cd cameo
    ```

2.  **Create the .env file manually**:
    Since `.env` is not in Git, create it on the server:
    
    ```bash
    nano backend/.env
    ```
    
    Paste your production variables:
    ```env
    # Production Environment
    DB_NAME=EventPhotoGallery
    # MONGODB_URI is handled by docker-compose automatically
    ```
    *Press `Ctrl+X`, then `Y`, then `Enter` to save.*

## Step 7: Deploy the Application

1.  **Get your VM's External IP**:
    *   Look at the GCP Console VM list to find the **External IP**.

2.  **Start the Application**:
    Replace `YOUR_VM_IP` with the actual IP address.

    ```bash
    # Set the VM IP environment variable
    export VM_IP=YOUR_VM_IP
    
    # Build and start the containers
    sudo -E docker compose up -d --build
    ```

3.  **Verify Deployment**:
    *   Run `sudo docker compose ps` to see running containers.
    *   Run `sudo docker compose logs -f` to see logs.

## Step 8: Access the Application

Open your browser and visit:
`http://<YOUR_VM_EXTERNAL_IP>`

- **Frontend**: Served at the root URL.
- **API Docs**: `http://<YOUR_VM_EXTERNAL_IP>/docs`

## Troubleshooting

- **"Connection Refused"**: Check firewall rules in GCP.
- **Database Connection Error**: Ensure the `mongo` container is running.
- **Frontend can't reach Backend**: Make sure you exported `VM_IP` before running docker compose.

## Maintenance

- **Stop the app**: `sudo docker compose down`
- **Update the app**:
    ```bash
    git pull
    sudo -E docker compose up -d --build
    ```
