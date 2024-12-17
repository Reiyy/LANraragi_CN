package LANraragi::Plugin::Login::nHentai;

use strict;
use warnings;
no warnings 'uninitialized';

use utf8;
use Mojo::UserAgent;
use LANraragi::Utils::Logging qw(get_logger);

#Meta-information about your plugin.
sub plugin_info {

    return (
		#Standard metadata
        name      => "nHentai CF Bypass",
        type      => "login",
        namespace => "nhentaicfbypass",
        author    => "Pheromir",
        version   => "0.1",
        description =>
          "通过重用浏览器中的Cookies来绕过Cloudflare的JavaScript挑战。CF Cookies和User-Agent 必须来自同一个浏览器。",
        parameters => [
              { type => "string", desc => "浏览器 UserAgent 字符串（可以在 http://useragentstring.com/ 找到您的浏览器的 UserAgent" },
			{ type => "string", desc => "nhentai.net 域名的 csrftoken Cookie" },
			{ type => "string", desc => "nhentai.net 域名的 cf_clearance Cookie" }
        ]
    );

}


# Mandatory function to be implemented by your login plugin
# Returns a Mojo::UserAgent object only!
sub do_login {

    # Login plugins only receive the parameters entered by the user.
    shift;
    my ( $useragent, $csrftoken, $cf_clearance ) = @_;
    return get_user_agent( $useragent, $csrftoken, $cf_clearance );
}

# get_user_agent(useragent, cf cookies)
# Try crafting a Mojo::UserAgent object that can access nHentai.
# Returns the UA object created.
sub get_user_agent {

    my ( $useragent, $csrftoken, $cf_clearance ) = @_;

    my $logger = get_logger( "nHentai Cloudflare Bypass", "plugins" );
    my $ua     = Mojo::UserAgent->new;

    if ( $useragent ne "" && $csrftoken ne "" && $cf_clearance ne "") {
        $logger->info("已提供UA和Cookies ($useragent $csrftoken $cf_clearance)!");
        $ua->transactor->name($useragent);

        #Setup the needed cookies
        $ua->cookie_jar->add(
            Mojo::Cookie::Response->new(
                name   => 'csrftoken',
                value  => $csrftoken,
                domain => 'nhentai.net',
                path   => '/'
            )
        );

        $ua->cookie_jar->add(
            Mojo::Cookie::Response->new(
                name   => 'cf_clearance',
                value  => $cf_clearance,
                domain => 'nhentai.net',
                path   => '/'
            )
        );

    } else {
        $logger->info("未提供Cookies，返回空的UserAgent。");
    }

    return $ua;

}

1;