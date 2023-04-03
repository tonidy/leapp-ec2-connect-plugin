import { Session } from "@noovolari/leapp-core/models/session";
import { AwsCredentialsPlugin } from "@noovolari/leapp-core/plugin-sdk/aws-credentials-plugin";
import { PluginLogLevel } from "@noovolari/leapp-core/plugin-sdk/plugin-log-level";
import fs from 'fs';
import os from 'os';
import path from 'path';
// import aws from 'aws-sdk';
import EC2InstanceConnect from 'aws-sdk/clients/ec2instanceconnect'

export class SshTunnelConfig {
    remoteHost: string;
    remotePort: string;
    localPort: string;
}

export class Ec2InstanceConnectConfig {
    sessionName: string;
    availabilityZone: string; // The zone where the instance was launched
    instanceId: string; // The instance ID to publish the key to.
    instanceOSUser: string; // This should be the user you wish to be when ssh-ing to the instance (eg, ec2-user@[instance IP])
    instanceIPAddress: string;
    sshPath: string;
    sshPublicKeyFile: string;
    sshPrivateKeyFile: string;
    mode: string;
    configs: SshTunnelConfig[];
}

export class LeappEc2InstanceConnectPlugin extends AwsCredentialsPlugin {
    get actionName(): string {
        return "Start EC2 Instance Connect";
    }

    get actionIcon(): string {
        return "fas fa-desktop";
    }

    static setConfig(data: any, region: string): any {
        return {
            region,
            accessKeyId: data.sessionToken.aws_access_key_id,
            secretAccessKey: data.sessionToken.aws_secret_access_key,
            sessionToken: data.sessionToken.aws_session_token,
        };
    }

    sendSSHPublicKey(
        config: Ec2InstanceConnectConfig,
        ec2InstanceConnectClient: EC2InstanceConnect,
        platform: string,
        session: any,
    ): Promise<any> {
        const homeDir = os.homedir();
        let sshPublicKeyFile = path.resolve(homeDir, ".ssh", config.sshPublicKeyFile)

        if (config.sshPath !== undefined) {
            sshPublicKeyFile = path.resolve(config.sshPath, config.sshPublicKeyFile)
        }
        let sshPublicKey = fs.readFileSync(sshPublicKeyFile)
        // this.pluginEnvironment.log(`sshPublicKey ${sshPublicKey}`, PluginLogLevel.info, true);

        var params = {
            AvailabilityZone: config.availabilityZone, // The zone where the instance was launched
            InstanceId: config.instanceId, // The instance ID to publish the key to.
            InstanceOSUser: config.instanceOSUser, // This should be the user you wish to be when ssh-ing to the instance (eg, ec2-user@[instance IP])
            SSHPublicKey: sshPublicKey.toString()// This should be in standard OpenSSH format (ssh-rsa [key body])
        };
        let result = new Promise((resolve, reject) => {
            ec2InstanceConnectClient.sendSSHPublicKey(params, function (err: any, data: any) {
                if (err) {
                    reject(err)
                }
                else {
                    resolve(data)
                }
                /*
                data = {
                 RequestId: "abcd1234-abcd-1234-abcd-1234abcd1234", // This request ID should be provided when contacting AWS Support.
                 Success: true// Should be true if the service does not return an error response.
                }
                */
            })
        });

        return result;
    }

    async getCommand(
        config: Ec2InstanceConnectConfig,
        ec2InstanceConnectClient: EC2InstanceConnect,
        platform: string,
        session: any,
    ) {
        let command;

        if (config.instanceId !== undefined) {

            const homeDir = os.homedir();
            let sshPrivateKeyPath = path.resolve(homeDir, ".ssh", config.sshPrivateKeyFile)

            if (config.sshPath !== undefined) {
                sshPrivateKeyPath = path.resolve(config.sshPath, config.sshPrivateKeyFile)
            }
            // this.pluginEnvironment.log(`SSH private key: ${sshPrivateKeyPath}`, PluginLogLevel.info, true);

            command = `ssh -i ${sshPrivateKeyPath} ${config.instanceOSUser}@${config.instanceIPAddress}`
        }

        return command;
    }

    async getTunnelCommand(
        config: Ec2InstanceConnectConfig,
        tunnelConfig: SshTunnelConfig,
        ec2InstanceConnectClient: EC2InstanceConnect,
        platform: string,
        session: any,
    ) {
        let command;

        if (config.instanceId !== undefined) {

            const homeDir = os.homedir();
            let sshPrivateKeyPath = path.resolve(homeDir, ".ssh", config.sshPrivateKeyFile)

            if (config.sshPath !== undefined) {
                sshPrivateKeyPath = path.resolve(config.sshPath, config.sshPrivateKeyFile)
            }
            // this.pluginEnvironment.log(`SSH private key: ${sshPrivateKeyPath}`, PluginLogLevel.info, true);

            command = `ssh -i ${sshPrivateKeyPath} -N -L ${tunnelConfig.localPort}:${tunnelConfig.remoteHost}:${tunnelConfig.remotePort} ${config.instanceOSUser}@${config.instanceIPAddress}`
        }

        return command;
    }

    async applySessionAction(session: Session, credentials: any): Promise<void> {
        this.pluginEnvironment.log("Starting opening EC2 instance connect", PluginLogLevel.info, true);
        const awsConfig = LeappEc2InstanceConnectPlugin.setConfig(credentials, session.region);
        const ec2InstanceConnectClient = new EC2InstanceConnect(awsConfig);
        // aws.config.update(LeappEc2InstanceConnectPlugin.setConfig(credentials, session.region));
        // const ec2InstanceConnectClient = new aws.EC2InstanceConnect();
        const platform = process.platform;
        const homeDir = os.homedir();

        let ec2InstanceConnectConfigFile = path.resolve(homeDir, ".Leapp/ec2-connect-config.json");
        let config: Ec2InstanceConnectConfig[] = [];
        const parallelCommandsSeparator = platform == "win32" ? " | " : " & ";

        try {
            config = JSON.parse(fs.readFileSync(ec2InstanceConnectConfigFile, 'utf-8'));
        } catch {
            this.pluginEnvironment.log(`No configuration file found in ~/.Leapp/ec2-connect-config.json`, PluginLogLevel.error, true);
            return;
        }

        const pluginConfig = config.find(item => item.sessionName === session.sessionName);
        if (pluginConfig !== undefined) {
            const env = {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                AWS_ACCESS_KEY_ID: credentials.sessionToken.aws_access_key_id,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                AWS_SECRET_ACCESS_KEY: credentials.sessionToken.aws_secret_access_key,
                // eslint-disable-next-line @typescript-eslint/naming-convention
                AWS_SESSION_TOKEN: credentials.sessionToken.aws_session_token,
            };
            let msg = await this.sendSSHPublicKey(pluginConfig, ec2InstanceConnectClient, platform, session)

            let sshTunnelConfigs: SshTunnelConfig[] = pluginConfig.configs;
            let commands: string[] = []

            if (pluginConfig.mode.toLowerCase().indexOf('remoting') > -1) {
                let cmd = await this.getCommand(pluginConfig, ec2InstanceConnectClient, platform, session)
                if (cmd !== undefined) {
                    commands.push(cmd);
                }
            } else if (pluginConfig.mode.toLowerCase().indexOf('forwarding') > -1) {
                await Promise.all(sshTunnelConfigs.map(async (cfg) => {
                    let cmd = await this.getTunnelCommand(pluginConfig, cfg, ec2InstanceConnectClient, platform, session)
                    if (cmd !== undefined) {
                        commands.push(cmd);
                    }
                }));
            }

            if (platform == "darwin" && commands.length > 0) {
                commands.push(`wait`);
            }

            if (commands.length > 0) {
                let command = commands.join(parallelCommandsSeparator);

                this.pluginEnvironment.openTerminal(command, env)
                    .then(() => {
                        this.pluginEnvironment.log("Terminal command successfully started", PluginLogLevel.info, true);
                    })
                    .catch((err) => {
                        this.pluginEnvironment.log(`Error while opening terminal command: ${err.message}`, PluginLogLevel.error, true);
                    });
            } else {
                this.pluginEnvironment.log(`No commands to execute`, PluginLogLevel.info, true);
            }
        }
        else {
            this.pluginEnvironment.log(`No configuration found for session called ${session.sessionName}`, PluginLogLevel.error, true);
        }
    }
}
