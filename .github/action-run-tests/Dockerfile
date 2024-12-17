FROM yareiy/lanraragi_cn:dev
# Use the base LRR container to have a prepared test environment

LABEL "name"="lrr-test"
LABEL "maintainer"="Reiyy <zhzhu722@reiyy.com>"
LABEL "version"="0.0.1"

LABEL "com.github.actions.name"="LANraragi 测试套件"
LABEL "com.github.actions.description"="运行LRR测试."
LABEL "com.github.actions.icon"="check"
LABEL "com.github.actions.color"="purple"

USER root

# Re-add devtools
RUN apk add perl-utils perl-dev wget g++ make

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]

