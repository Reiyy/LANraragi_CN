package LANraragi::Plugin::Login::EHentai;

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
        name      => "E-Hentai",
        type      => "login",
        namespace => "ehlogin",
        author    => "Difegue",
        version   => "2.3",
        description =>
          "处理 E-H 登录。如果您有一个可以访问 fjorded 内容或 Exhentai 的账户，添加凭据后可以解析更多档案。",
        parameters => [
            { type => "int",    desc => "ipb_member_id cookie" },
            { type => "string", desc => "ipb_pass_hash cookie" },
            { type => "string", desc => "star cookie (可选，如果有，你可以在不使用 Exhentai 的情况下查看 fjorded 内容)" },
            { type => "string", desc => "igneous cookie(可选，如果有，你可以在没有欧洲或美国IP的情况下访问Exhentai)" }
        ]
    );

}

# Mandatory function to be implemented by your login plugin
# Returns a Mojo::UserAgent object only!
sub do_login {

    # Login plugins only receive the parameters entered by the user.
    shift;
    my ( $ipb_member_id, $ipb_pass_hash, $star ,$igneous ) = @_;
    return get_user_agent( $ipb_member_id, $ipb_pass_hash, $star ,$igneous );
}

# get_user_agent(ipb cookies)
# Try crafting a Mojo::UserAgent object that can access E-Hentai.
# Returns the UA object created.
sub get_user_agent {

    my ( $ipb_member_id, $ipb_pass_hash, $star, $igneous ) = @_;

    my $logger = get_logger( "E-Hentai Login", "plugins" );
    my $ua     = Mojo::UserAgent->new;

    if ( $ipb_member_id ne "" && $ipb_pass_hash ne "" ) {
        $logger->info("已提供 Cookies ($ipb_member_id $ipb_pass_hash $star $igneous)!");

        #Setup the needed cookies with both domains
        #They should translate to exhentai cookies with the igneous value generated
        $ua->cookie_jar->add(
            Mojo::Cookie::Response->new(
                name   => 'ipb_member_id',
                value  => $ipb_member_id,
                domain => 'exhentai.org',
                path   => '/'
            )
        );

        $ua->cookie_jar->add(
            Mojo::Cookie::Response->new(
                name   => 'ipb_member_id',
                value  => $ipb_member_id,
                domain => 'e-hentai.org',
                path   => '/'
            )
        );

        $ua->cookie_jar->add(
            Mojo::Cookie::Response->new(
                name   => 'ipb_pass_hash',
                value  => $ipb_pass_hash,
                domain => 'exhentai.org',
                path   => '/'
            )
        );

        $ua->cookie_jar->add(
            Mojo::Cookie::Response->new(
                name   => 'ipb_pass_hash',
                value  => $ipb_pass_hash,
                domain => 'e-hentai.org',
                path   => '/'
            )
        );

        $ua->cookie_jar->add(
            Mojo::Cookie::Response->new(
                name   => 'star',
                value  => $star,
                domain => 'exhentai.org',
                path   => '/'
            )
        );

        $ua->cookie_jar->add(
            Mojo::Cookie::Response->new(
                name   => 'igneous',
                value  => $igneous,
                domain => 'exhentai.org',
                path   => '/'
            )
        );
        
        $ua->cookie_jar->add(
            Mojo::Cookie::Response->new(
                name   => 'star',
                value  => $star,
                domain => 'e-hentai.org',
                path   => '/'
            )
        );

        $ua->cookie_jar->add(
            Mojo::Cookie::Response->new(
                name   => 'igneous',
                value  => $igneous,
                domain => 'e-hentai.org',
                path   => '/'
            )
        );
        
        $ua->cookie_jar->add(
            Mojo::Cookie::Response->new(
                name   => 'ipb_coppa',
                value  => '0',
                domain => 'forums.e-hentai.org',
                path   => '/'
            )
        );

        #Skips the "offensive warning" screen so that such galleries archive gIDs can be easily retrieved by Download script.
        $ua->cookie_jar->add(
            Mojo::Cookie::Response->new(
                name   => 'nw',
                value  => '1',
                domain => 'exhentai.org',
                path   => '/'
            )
        );

        $ua->cookie_jar->add(
            Mojo::Cookie::Response->new(
                name   => 'nw',
                value  => '1',
                domain => 'e-hentai.org',
                path   => '/'
            )
        );


    } else {
        $logger->info("未提供 Cookies，返回空的 UserAgent。");
    }

    return $ua;

}

1;
