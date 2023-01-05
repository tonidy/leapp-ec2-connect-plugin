<p align="center">
  <img src="https://github.com/Noovolari/leapp/blob/master/.github/images/README-1.png#gh-dark-mode-only" alt="Leapp" height="150" />
    <img src="https://github.com/Noovolari/leapp/blob/master/.github/images/README-1-dark.png#gh-light-mode-only" alt="Leapp" height="150" />
</p>

<h1 align="center">Leapp EC2 Instance Connect Plugin</h1>

<h2>Introduction</h2>
<p>This plugin aims to help developers and AWS users in general for remoting and forwarding into EC2 instance!</p>

<h2>How it works?</h2>
The plugin uses the `aws ec2-instance-connect send-ssh-public-key`command to upload SSH public key to EC2 instance. Then SSH-ing (remote/forward) to EC2 instance.

<h2>How to configure the tunnels you need</h2>

This plugin makes use of a json configuration file (`ec2-connect-config.json`) where you can specify the parameters needed to establish the tunnel.

You can use the below example to create your own file and place it in the Leapp installation folder (usually in `$HOME` (macos/linux/powershell) or `%USERPROFILE%` (windows/CMD) user directory).<br><br>
For example:<br>
`$HOME/.Leapp/ec2-connect-config.json`

You can find an example of such file in this repository called `ec2-connect-config.example.json`

```json
[
  {
    "sessionName": "Session1",
    "availabilityZone": "ap-southeast-1c",
    "instanceId": "i-0abcdefghijkl1234",
    "instanceOSUser": "ec2-user",
    "instanceIPAddress": "8.8.8.8",
    "sshPath": "/home/username/.ssh",
    "sshPublicKeyFile": "id_ed25519.pub",
    "sshPrivateKeyFile": "id_ed25519",
    "modeType": "remoting/forwarding",
    "mode": "forwarding",
    "configs": [
      {
        "remoteHost": "ec2instancename.xxxx.ap-southeast-1.rds.amazonaws.com",
        "remotePort": "3306",
        "localPort": "3307"
      }
    ]
  },
  {
    "sessionName": "Session2",
    "availabilityZone": "ap-southeast-1c",
    "instanceId": "i-0abcdefghijkl1234",
    "instanceOSUser": "ec2-user",
    "instanceIPAddress": "8.8.8.8",
    "sshPath": "/home/username/.ssh",
    "sshPublicKeyFile": "id_ed25519.pub",
    "sshPrivateKeyFile": "id_ed25519",
    "modeType": "remoting/forwarding",
    "mode": "remoting"
  }
]
```
It is now possible to identify the target ec2 instance that you use as a bastion, by specifying a targetTagKey and a targetTagValue your instance is tagged with.

<h2>Plugin in action!</h2>
It's possible to install and use this plugin as well explained by the Noovolari team throughout the Leapp's documentation that you can find here:
<a href="https://docs.leapp.cloud/0.17.0/plugins/plugins-introduction/">Leapp plugins introduction</a><br><br>

The npm package name to find and install this plugin is: `leapp-ec2-instance-connect-plugin`

<img src="how_to_use.jpg">