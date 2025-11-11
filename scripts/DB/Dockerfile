# Dockerfile - 基於 postgres:17，並安裝 rclone 以便從 GDrive 拉備份
FROM postgres:17

# 安裝 rclone（官方安裝 script）
USER root
RUN apt-get update \
  && apt-get install -y curl gnupg lsb-release ca-certificates unzip \
  && curl https://rclone.org/install.sh | bash \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# 放置 helper 腳本到 /usr/local/bin
COPY restore_from_local.sh /usr/local/bin/restore_from_local.sh
COPY fetch_from_gdrive_and_restore.sh /usr/local/bin/fetch_from_gdrive_and_restore.sh

RUN chmod +x /usr/local/bin/restore_from_local.sh /usr/local/bin/fetch_from_gdrive_and_restore.sh

# 回到 postgres user（保持官方 image 行為）
USER postgres

# 不覆寫原本的 ENTRYPOINT/CMD（讓容器維持 postgres server 功能）
