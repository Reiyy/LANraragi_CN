#!/bin/sh

echo "🎌 正在运行 LRR 测试套件 🎌"

# Install cpan deps in case some are missing
perl ./tools/install.pl install-back

# Run the perl tests on the repo
prove -r -l -v tests/

