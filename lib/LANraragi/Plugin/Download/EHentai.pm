package LANraragi::Plugin::Download::EHentai;

use strict;
use warnings;
no warnings 'uninitialized';
use utf8;

use URI;
use Mojo::UserAgent;

use LANraragi::Utils::Logging qw(get_logger);

# Meta-information about your plugin.
sub plugin_info {

    return (
        # Standard metadata
        name       => "E*Hentai 下载器",
        type       => "download",
        namespace  => "ehdl",
        login_from => "ehlogin",
        author     => "Difegue",
        version    => "1.1",
        description =>
          "下载给定的 e*hentai URL 并将其添加到 LANraragi。这将使用 GP 调用档案，因此请确保你有足够的GP!",

        # Downloader-specific metadata
        url_regex => "https?:\/\/e(-|x)hentai.org\/g\/.*\/.*"
    );

}

# Mandatory function to be implemented by your downloader
sub provide_url {
    shift;
    my $lrr_info = shift;
    my $logger   = get_logger( "EH Downloader", "plugins" );

    # Get the URL to download
    # We don't really download anything here, we just use the E-H URL to get an archiver URL that can be downloaded normally.
    my $url     = $lrr_info->{url};
    my $gID     = "";
    my $gToken  = "";
    my $archKey = "";
    my $domain  = ( $url =~ /.*exhentai\.org/gi ) ? 'https://exhentai.org' : 'https://e-hentai.org';

    $logger->debug($url);
    if ( $url =~ /.*\/g\/([0-9]*)\/([0-z]*)\/*.*/ ) {
        $gID    = $1;
        $gToken = $2;
    } else {
        return ( error => "不是有效的 E-H URL!" );
    }

    $logger->debug("gID: $gID, gToken: $gToken");

    my $archiverurl = "$domain\/archiver.php?gid=$gID&token=$gToken";
    $logger->info("档案URL: $archiverurl");

    # Do a quick GET to check for potential errors
    my $archiverHtml = $lrr_info->{user_agent}->max_redirects(5)->get($archiverurl)->result->body;
    if ( index( $archiverHtml, "Invalid archiver key" ) != -1 ) {
        return ( error => "无效的档案Key。 ($archiverurl)" );
    }
    if ( index( $archiverHtml, "This page requires you to log on." ) != -1 ) {
        return ( error => "无效的 E*Hentai 登录凭据。请确保登录插件已正确设置。" );
    }

    # We only use original downloads, so we POST directly to the archiver form with dltype="org"
    # and dlcheck ="Download+Original+Archive"
    my $response = $lrr_info->{user_agent}->max_redirects(5)->post(
        $archiverurl => form => {
            dltype  => 'org',
            dlcheck => 'Download+Original+Archive'
        }
    )->result;

    my $content = $response->body;
    $logger->debug("/archiver.php 结果: $content");

    if ($content =~ /.*Insufficient funds.*/gim) {
        $logger->debug("GP 不足，正在中止下载。");
        return ( error => "你没有足够的 GP 以下载此 URL" );
    }

    my $finalURL = URI->new();
    eval {
        # Parse that to get the final URL
        if ( $content =~ /.*document.location = "(.*)".*/gim ) {
            $finalURL = URI->new($1);
            $logger->info("最终获取的URL: $finalURL");
        }
    };

    if ( $@ || $finalURL eq "" ) {
        return ( error => "无法继续下载原始大小：<pre>$content</pre>" );
    }

    # Set URL query parameters to ?start=1 to automatically trigger the download.
    $finalURL->query("start=1");

    # All done!
    return ( download_url => $finalURL->as_string );
}

1;
