# SpendWise Finance Tracker — Deployment Guide

This guide walks through deploying the SpendWise app to a Linux server (or VM) using the Ansible playbook included in this project. It assumes you're on **Windows** and will use **WSL (Windows Subsystem for Linux)** as your control machine, deploying to a separate Linux target (e.g. a VMware VM).hi

---

## 1. Prerequisites

- A Windows machine with **WSL2 + Ubuntu** installed
- A **target Linux server or VM** you can SSH into, with a known IP address, username, and password (or SSH key)
- SSH enabled on that target (`sudo systemctl enable --now ssh`)
- A **Groq API key** (used for the app's chatbot feature) — get one from [console.groq.com](https://console.groq.com) if you don't have one

---

## 2. Set up WSL

1. Open **PowerShell as Administrator** and run:
   ```powershell
   wsl --install
   ```
   If you see `ERROR_ALREADY_EXISTS`, WSL is already installed — just open the **Ubuntu** app from your Start menu.

2. Inside the Ubuntu terminal, install Ansible and the Docker collection:
   ```bash
   sudo apt update
   sudo apt install -y ansible
   ansible-galaxy collection install community.docker
   ```

---

## 3. Get the project into WSL

Working from `/mnt/c/...` (your Windows drive) inside WSL causes permission issues with Ansible, so copy the project into your Linux home directory first.

1. Extract the zip on Windows (or via WSL) to your Downloads folder.
2. Copy it into WSL's own filesystem:
   ```bash
   cp -r /mnt/c/Users/<your-username>/Downloads/Team1-FinanceTracker-project-main ~/
   cd ~/Team1-FinanceTracker-project-main/ansible
   ```

---

## 4. Point the playbook at your target server

Edit the inventory file:
```bash
nano hosts
```

Replace the placeholder IP/credentials under `[spendwise]` with your real target:
```
[spendwise]
<your-server-ip> ansible_ssh_user=<your-ssh-user> ansible_ssh_pass=<your-ssh-password>
```

To find your VM's IP, run this **on the VM itself**:
```bash
hostname -I
```

> **SSH keys are more secure than passwords** if you have one set up — you can use `ansible_ssh_private_key_file=~/.ssh/your-key` instead of `ansible_ssh_pass`.

---

## 5. Run the playbook

From the `ansible/` directory in WSL:

```bash
ansible-playbook playbook.yml \
  --extra-vars "groq_api_key=YOUR_GROQ_KEY db_password=password123" \
  --ask-become-pass
```

- `--ask-become-pass` prompts you for the **sudo password** on the target server (needed because the playbook installs packages and runs Docker as root).
- `groq_api_key` and `db_password` are secrets passed at runtime rather than hardcoded — you can override any other variable defined in `hosts` the same way if needed (e.g. `app_port`, `docker_image`).

The playbook will:
1. Verify it can reach and run commands on the server
2. Install Docker and required tools
3. Copy the database schema (`init.sql`) to the server
4. Generate a `.env` file for the app
5. Deploy a MySQL container and load the schema
6. Deploy the SpendWise app container, wired up to that database
7. Run a health check to confirm the app is responding

A successful run ends with a `PLAY RECAP` showing `failed=0`.

---

## 6. Verify it worked

Open a browser and go to:
```
http://<your-server-ip>:3000
```

You should see the SpendWise app running.

You can also SSH into the server and check the containers directly:
```bash
ssh <user>@<server-ip>
docker ps
```
You should see `spendwise-mysql` and `spendwise-container` both running.

---

## 7. Troubleshooting quick reference

| Symptom | Likely cause | Fix |
|---|---|---|
| `ansible-galaxy` not recognized | Running in PowerShell, not WSL | Open the Ubuntu app or run `wsl -d Ubuntu` |
| `No inventory was parsed` | Running from a Windows-mounted path (`/mnt/c/...`) | Copy project into `~/` inside WSL, or run with `-i hosts` |
| `Connection timed out` to target IP | Wrong/unreachable IP in `hosts` | Confirm IP with `hostname -I` on the target, check network mode (NAT/Bridged) |
| `Missing sudo password` | `become: yes` needs the target's sudo password | Add `--ask-become-pass` to the command |
| `pkgProblemResolver::Resolve generated breaks` (Docker install) | Conflicting Docker CE packages already installed | Already handled — this playbook removes `docker-ce`/`containerd.io` before installing `docker.io` |
| `Access denied for user 'root'` (MySQL) | A MySQL container from an earlier run has stale credentials | `docker rm -f spendwise-mysql` on the target, then re-run |
| `Can't connect to local MySQL server through socket` | MySQL's first-time init briefly restarts internally | Already handled — the playbook now waits and retries through this window |

---

## 8. Security notes

- **Rotate any API key or password you've shared in chat, email, or screenshots** before using this in anything beyond a local test.
- The `hosts` file can contain plaintext credentials — fine for a disposable lab VM, but use SSH keys and Ansible Vault for anything you care about keeping secure.
- Don't commit real secrets (API keys, passwords) into version control. Prefer passing them via `--extra-vars` or a local, gitignored `hosts` file, as shown above.
