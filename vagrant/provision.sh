#!/usr/bin/env bash

# This section exists to work around a bug in Vagrant as of version 2.1.1 which
# does not configure IPv4 properly for the host-only adapter in Ubuntu 18.04.
rm /etc/netplan/50-cloud-init.yaml
cp /vagrant/netplan-config.yaml /etc/netplan/99-vagrant.yaml
netplan apply
sleep 5

apt-get update
apt-get dist-upgrade

# Application dependiencies
apt-get install -y npm git

# Development/vagrant dependencies
apt-get install -y avahi-daemon avahi-utils net-tools

# Set up an email testing environment that catches all mail sent whatever the
# address and deliver it to the same place so most testing senarios may be
# run safely - see: http://www.newredo.com/building-a-test-email-server/
# install mail transfer agent (Postfix) and pop3 server (Dovecot)
debconf-set-selections <<< "postfix postfix/mailname string localhost"
debconf-set-selections <<< "postfix postfix/main_mailer_type string 'Local only'"
apt-get install -y postfix dovecot-pop3d

# set up a virtual alias map which will redirect all the mail
sed -i '$ a\'"virtual_alias_maps = regexp:/etc/postfix/virtual" /etc/postfix/main.cf
# create this file - not sure why?
echo "/.*/ mailsink" > /etc/postfix/virtual

# add the mailsink user with password mailsink
adduser mailsink --gecos "NewRedo Ltd., Futurelabs, 0113 320 7336, 0113 320 7336," --disabled-password
echo "mailsink:mailsink" | sudo chpasswd

# config dovecot
sed --in-place "s|#disable_plaintext_auth = yes|disable_plaintext_auth = no|" /etc/dovecot/conf.d/10-auth.conf
sed --in-place "s|#mail_location = |mail_location = mbox:~/mail:INBOX=/var/mail/%u|" /etc/dovecot/conf.d/10-mail.conf
sed --in-place "s|#mail_privileged_group =|mail_privileged_group = mail|" /etc/dovecot/conf.d/10-mail.conf
sed --in-place "s|inet_interfaces = loopback-only|inet_interfaces = all|" /etc/postfix/main.cf
ufw allow pop3
ufw allow smtp
service dovecot restart
service postfix restart
